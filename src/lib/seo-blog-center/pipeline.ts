import { revalidatePath } from "next/cache";
import { blogPostToFirestorePayload } from "@/lib/blog-firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  generateSeoBlogDraft,
  seoBlogDraftToFirestorePost,
} from "@/lib/seo-blog-center/blog-writer";
import { generateCityKeywordResearch } from "@/lib/seo-blog-center/city-keywords";
import { discoverGscKeywords } from "@/lib/seo-blog-center/gsc-keywords";
import {
  discoverGoogleSuggestKeywords,
  discoverTemplateKeywords,
} from "@/lib/seo-blog-center/keyword-agent";
import { generateSeoMetaForKeyword } from "@/lib/seo-blog-center/seo-meta";
import {
  addSeoBlogLog,
  getMetaForKeyword,
  getSeoBlogSettings,
  listDrafts,
  listKeywords,
  saveDraft,
  saveKeyword,
  saveMeta,
  updateSeoBlogSettings,
} from "@/lib/seo-blog-center/store";
import type { SeoBlogDraft, SeoBlogKeyword } from "@/lib/seo-blog-center/types";
import { keywordHasDraft } from "@/lib/seo-blog-center/utils";

export async function runKeywordGeneration(actorId = "system"): Promise<{
  added: number;
  gsc: number;
  suggest: number;
  templates: number;
  duplicatesSkipped: number;
}> {
  const settings = await getSeoBlogSettings();
  const existing = await listKeywords(undefined, 500);
  const exclude = new Set(existing.map((k) => k.keyword.toLowerCase().trim()));
  const limit = settings.keywordsPerDay;
  const collected: SeoBlogKeyword[] = [];
  let gsc = 0;
  let suggest = 0;
  let templates = 0;

  if (settings.includeGscKeywords) {
    const gscResult = await discoverGscKeywords(exclude, Math.ceil(limit * 0.4));
    for (const kw of gscResult.keywords) {
      collected.push(kw);
      gsc += 1;
    }
    if (gscResult.error) {
      await addSeoBlogLog({
        type: "error",
        message: `GSC keyword import: ${gscResult.error}`,
      });
    }
  }

  if (settings.includeGoogleSuggest && collected.length < limit) {
    const suggestKws = await discoverGoogleSuggestKeywords(
      exclude,
      limit - collected.length,
    );
    for (const kw of suggestKws) {
      exclude.add(kw.keyword.toLowerCase());
      collected.push(kw);
      suggest += 1;
    }
  }

  if (settings.includeTemplates && collected.length < limit) {
    const templateKws = discoverTemplateKeywords(exclude, limit - collected.length);
    for (const kw of templateKws) {
      exclude.add(kw.keyword.toLowerCase());
      collected.push(kw);
      templates += 1;
    }
  }

  const fresh = collected
    .filter((k) => !existing.some((e) => e.keyword.toLowerCase() === k.keyword.toLowerCase()))
    .sort((a, b) => b.seoScore - a.seoScore)
    .slice(0, limit);

  for (const kw of fresh) {
    await saveKeyword(kw);
  }

  await addSeoBlogLog({
    type: "keyword_generated",
    message: `Added ${fresh.length} keywords (GSC: ${gsc}, suggest: ${suggest}, templates: ${templates})`,
  });

  if (settings.autoApproveKeywords) {
    for (const kw of fresh.slice(0, Math.min(5, settings.blogsPerDay * 2))) {
      await approveKeyword(kw.id, actorId, true);
    }
  }

  return {
    added: fresh.length,
    gsc,
    suggest,
    templates,
    duplicatesSkipped: collected.length - fresh.length,
  };
}

export async function previewCityKeywords(city: string, limit = 80) {
  const existing = await listKeywords(undefined, 500);
  return generateCityKeywordResearch(
    city,
    limit,
    existing.map((k) => k.keyword),
  );
}

export async function saveCityKeywords(
  keywords: SeoBlogKeyword[],
  actorId = "system",
  autoApprove = false,
): Promise<{ added: number; duplicatesSkipped: number }> {
  const existing = await listKeywords(undefined, 500);
  const seen = new Set(existing.map((k) => k.keyword.toLowerCase()));
  let added = 0;
  let duplicatesSkipped = 0;

  for (const kw of keywords) {
    const key = kw.keyword.toLowerCase().trim();
    if (!key || seen.has(key)) {
      duplicatesSkipped += 1;
      continue;
    }
    seen.add(key);
    await saveKeyword({ ...kw, status: "pending" });
    added += 1;
    if (autoApprove) {
      await approveKeyword(kw.id, actorId, true);
    }
  }

  await addSeoBlogLog({
    type: "keyword_generated",
    message: `City research: saved ${added} keywords`,
  });

  return { added, duplicatesSkipped };
}

export async function approveKeyword(
  id: string,
  approvedBy: string,
  skipBlog = false,
): Promise<{ keyword: SeoBlogKeyword; seoMeta: Awaited<ReturnType<typeof generateSeoMetaForKeyword>> }> {
  const keyword = await (async () => {
    const { getKeywordById } = await import("@/lib/seo-blog-center/store");
    return getKeywordById(id);
  })();
  if (!keyword) throw new Error("Keyword not found");

  const updated: SeoBlogKeyword = {
    ...keyword,
    status: "approved",
    approvedAt: new Date().toISOString(),
    approvedBy,
    updatedAt: new Date().toISOString(),
  };
  await saveKeyword(updated);

  const seoMeta = await generateSeoMetaForKeyword(updated);
  await saveMeta(seoMeta);

  await addSeoBlogLog({
    type: "keyword_approved",
    message: `Approved: ${updated.keyword}`,
    resourceId: updated.id,
  });
  await addSeoBlogLog({
    type: "seo_meta_generated",
    message: `SEO meta: ${updated.keyword}`,
    resourceId: seoMeta.id,
  });

  const settings = await getSeoBlogSettings();
  if (settings.autoGenerateBlogs && !skipBlog) {
    await generateBlogFromKeyword(updated.id, approvedBy);
  }

  return { keyword: updated, seoMeta };
}

export async function rejectKeyword(id: string, reason?: string): Promise<void> {
  const { getKeywordById } = await import("@/lib/seo-blog-center/store");
  const keyword = await getKeywordById(id);
  if (!keyword) throw new Error("Keyword not found");
  await saveKeyword({
    ...keyword,
    status: "rejected",
    updatedAt: new Date().toISOString(),
  });
  await addSeoBlogLog({
    type: "keyword_rejected",
    message: reason ?? `Rejected: ${keyword.keyword}`,
    resourceId: id,
  });
}

export async function generateBlogFromKeyword(
  keywordId: string,
  actorId = "system",
): Promise<SeoBlogDraft> {
  const { getKeywordById } = await import("@/lib/seo-blog-center/store");
  const keyword = await getKeywordById(keywordId);
  if (!keyword) throw new Error("Keyword not found");
  if (keyword.status !== "approved") throw new Error("Keyword must be approved first");

  const drafts = await listDrafts(undefined, 300);
  if (keywordHasDraft(keyword, drafts)) {
    throw new Error("A blog draft already exists for this keyword");
  }

  const seoMeta = await getMetaForKeyword(keywordId);
  const settings = await getSeoBlogSettings();
  const draft = await generateSeoBlogDraft({ keyword, seoMeta });
  draft.status = settings.approvalRequired ? "pending_approval" : "approved";

  await saveDraft(draft);
  await addSeoBlogLog({
    type: "blog_generated",
    message: `Draft: ${draft.title}`,
    resourceId: draft.id,
  });

  if (settings.autoApproveBlogs && draft.status === "pending_approval") {
    return approveBlogDraft(draft.id, actorId);
  }
  if (settings.autoPublish && draft.status === "approved") {
    return publishBlogDraft(draft.id, actorId);
  }

  return draft;
}

export async function approveBlogDraft(id: string, approvedBy: string): Promise<SeoBlogDraft> {
  const { getDraftById } = await import("@/lib/seo-blog-center/store");
  const draft = await getDraftById(id);
  if (!draft) throw new Error("Draft not found");

  const updated: SeoBlogDraft = {
    ...draft,
    status: "approved",
    approvedAt: new Date().toISOString(),
    approvedBy,
    updatedAt: new Date().toISOString(),
  };
  await saveDraft(updated);
  await addSeoBlogLog({
    type: "blog_approved",
    message: `Approved draft: ${updated.title}`,
    resourceId: id,
  });

  const settings = await getSeoBlogSettings();
  if (settings.autoPublish) {
    return publishBlogDraft(id, approvedBy);
  }
  return updated;
}

export async function publishBlogDraft(id: string, approvedBy: string): Promise<SeoBlogDraft> {
  const { getDraftById } = await import("@/lib/seo-blog-center/store");
  const draft = await getDraftById(id);
  if (!draft) throw new Error("Draft not found");

  const settings = await getSeoBlogSettings();
  if (settings.approvalRequired && draft.status !== "approved" && draft.status !== "published") {
    throw new Error("Draft must be approved before publishing");
  }

  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin not configured");

  const post = seoBlogDraftToFirestorePost(draft, true);
  await db
    .collection("blogPosts")
    .doc(post.slug)
    .set(blogPostToFirestorePayload(post), { merge: true });

  const now = new Date().toISOString();
  const updated: SeoBlogDraft = {
    ...draft,
    status: "published",
    publishedAt: now,
    publishedBlogSlug: post.slug,
    approvedBy: draft.approvedBy ?? approvedBy,
    updatedAt: now,
  };
  await saveDraft(updated);

  try {
    revalidatePath("/blog");
    revalidatePath(`/blog/${post.slug}`);
    revalidatePath("/sitemap.xml");
  } catch {
    /* outside request context */
  }

  await addSeoBlogLog({
    type: "blog_published",
    message: `Published: ${post.title} → /blog/${post.slug}`,
    resourceId: id,
  });

  return updated;
}

/** Full daily cron: keywords → blogs → publish (respects settings). */
export async function runSeoBlogCenterDailyPipeline(actorId = "cron"): Promise<{
  keywordsAdded: number;
  blogsGenerated: number;
  blogsPublished: number;
  errors: string[];
}> {
  const settings = await getSeoBlogSettings();
  if (!settings.enabled) {
    return { keywordsAdded: 0, blogsGenerated: 0, blogsPublished: 0, errors: [] };
  }

  const errors: string[] = [];
  let keywordsAdded = 0;
  let blogsGenerated = 0;
  let blogsPublished = 0;

  try {
    const kwResult = await runKeywordGeneration(actorId);
    keywordsAdded = kwResult.added;
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }

  const keywordsWithoutDrafts = await filterKeywordsWithoutDrafts(
    await listKeywords("approved", 50),
  );

  for (const kw of keywordsWithoutDrafts) {
    if (blogsGenerated >= settings.blogsPerDay) break;
    try {
      const draft = await generateBlogFromKeyword(kw.id, actorId);
      blogsGenerated += 1;
      if (draft.status === "published") blogsPublished += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes("already exists")) errors.push(msg);
    }
  }

  const approvedDrafts = (await listDrafts(undefined, 50)).filter(
    (d) => d.status === "approved",
  );
  for (const d of approvedDrafts) {
    if (blogsPublished >= settings.blogsPerDay) break;
    try {
      await publishBlogDraft(d.id, actorId);
      blogsPublished += 1;
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  await addSeoBlogLog({
    type: "pipeline_run",
    message: `Pipeline: +${keywordsAdded} kw, ${blogsGenerated} drafts, ${blogsPublished} published`,
    error: errors.length ? errors.join("; ") : undefined,
  });

  return { keywordsAdded, blogsGenerated, blogsPublished, errors };
}

async function filterKeywordsWithoutDrafts(
  keywords: SeoBlogKeyword[],
): Promise<SeoBlogKeyword[]> {
  const drafts = await listDrafts(undefined, 300);
  return keywords.filter((k) => !keywordHasDraft(k, drafts));
}

export { updateSeoBlogSettings };
