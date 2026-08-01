import { revalidatePath } from "next/cache";
import { getAdminDb } from "@/lib/firebase-admin";
import { stripUndefinedDeep } from "@/lib/firestore-json";
import {
  blogPostToFirestorePayload,
  parseBlogPostFromFirestore,
  type BlogPostFirestore,
} from "@/lib/blog-firestore";
import {
  parseSeoPageFromFirestore,
  seoPageToFirestorePayload,
} from "@/lib/seo-page-firestore";
import { appendSeoIntelLog } from "./activity-log";
import { countAppliedToday, getChangeVersion, getSuggestion, saveChangeVersion, saveSuggestion } from "./suggestions-store";
import { getSeoIntelSettings } from "./settings";
import type { SeoIntelSuggestion } from "./types";

const APPLYABLE = new Set([
  "update_seo_title",
  "update_meta_description",
  "improve_h1",
  "add_faqs",
  "add_internal_links",
  "expand_content",
  "create_blog",
  "fix_cannibalisation",
]);

const MANUAL_ONLY = new Set([
  "create_service_page",
  "consolidate_pages",
  "improve_url",
  "fix_canonical",
]);

function estimateReadTime(content: string): string {
  const words = content.split(/\s+/).filter(Boolean).length;
  const mins = Math.max(4, Math.min(14, Math.ceil(words / 200)));
  return `${mins} min read`;
}

export async function decideSuggestion(input: {
  id: string;
  decision: "approve" | "reject" | "defer";
  rejectionReason?: string;
  actor: string;
}): Promise<SeoIntelSuggestion> {
  const current = await getSuggestion(input.id);
  if (!current) throw new Error("Suggestion not found");

  let status: SeoIntelSuggestion["status"] = current.status;
  if (input.decision === "approve") status = "approved";
  if (input.decision === "reject") status = "rejected";
  if (input.decision === "defer") status = "deferred";

  const next = await saveSuggestion({
    ...current,
    status,
    rejectionReason:
      input.decision === "reject"
        ? input.rejectionReason?.trim() || "Rejected by admin"
        : current.rejectionReason,
    approvedAt:
      input.decision === "approve"
        ? new Date().toISOString()
        : current.approvedAt,
  });

  await appendSeoIntelLog({
    action: `suggestions.${input.decision}`,
    entityType: "suggestion",
    entityId: input.id,
    actor: input.actor,
    details: `${input.decision} ${current.type} for ${current.keyword}`,
    result: "ok",
  });
  return next;
}

export async function applySuggestion(input: {
  id: string;
  actor: string;
  force?: boolean;
}): Promise<
  | { ok: true; suggestion: SeoIntelSuggestion }
  | { ok: false; error: string }
> {
  const settings = await getSeoIntelSettings();
  if (settings.automationPaused && !input.force) {
    return { ok: false, error: "Automation paused" };
  }

  const appliedToday = await countAppliedToday();
  if (appliedToday >= settings.dailyChangeLimit) {
    return {
      ok: false,
      error: `Daily change limit (${settings.dailyChangeLimit}) reached`,
    };
  }

  const suggestion = await getSuggestion(input.id);
  if (!suggestion) return { ok: false, error: "Suggestion not found" };

  if (
    !["approved", "auto_approved", "edited_by_admin"].includes(suggestion.status) &&
    !input.force
  ) {
    return { ok: false, error: `Cannot apply status ${suggestion.status}` };
  }

  if (MANUAL_ONLY.has(suggestion.type) || !APPLYABLE.has(suggestion.type)) {
    return {
      ok: false,
      error: "This suggestion type requires manual CMS work (not auto-applicable)",
    };
  }

  if (!suggestion.proposedPatch) {
    return { ok: false, error: "No proposed patch to apply" };
  }

  const db = getAdminDb();
  if (!db) return { ok: false, error: "Server database not configured" };

  await saveSuggestion({ ...suggestion, status: "applying", applyError: null });

  try {
    if (suggestion.type === "create_blog") {
      const result = await applyCreateBlogDraft(suggestion);
      if (!result.ok) {
        await saveSuggestion({
          ...suggestion,
          status: "failed",
          applyError: result.error,
        });
        return result;
      }
      return { ok: true, suggestion: result.suggestion };
    }

    if (suggestion.type === "fix_cannibalisation") {
      const result = await applyCannibalInternalLinks(suggestion, input.actor);
      if (!result.ok) {
        await saveSuggestion({
          ...suggestion,
          status: "failed",
          applyError: result.error,
        });
        return result;
      }
      return { ok: true, suggestion: result.suggestion };
    }

    if (!suggestion.targetCollection || !suggestion.targetDocId) {
      return { ok: false, error: "Missing target collection/doc" };
    }

    const col = suggestion.targetCollection;
    const docId = suggestion.targetDocId;
    const snap = await db.collection(col).doc(docId).get();
    if (!snap.exists) {
      return { ok: false, error: `${col}/${docId} not found` };
    }
    const before = (snap.data() || {}) as Record<string, unknown>;

    let patch: Record<string, unknown> = { ...suggestion.proposedPatch };
    const now = new Date().toISOString();

    if (col === "blogPosts") {
      const post = parseBlogPostFromFirestore(docId, before, {
        requirePublished: false,
      });
      if (!post) return { ok: false, error: "Could not parse blog post" };

      let faqs = post.faqs ?? [];
      if (Array.isArray(patch.faqs) && patch.faqsMode === "merge") {
        const incoming = patch.faqs as { question: string; answer: string }[];
        const existingQs = new Set(faqs.map((f) => f.question.toLowerCase()));
        for (const f of incoming) {
          if (!existingQs.has(f.question.toLowerCase())) faqs.push(f);
        }
      } else if (Array.isArray(patch.faqs)) {
        faqs = patch.faqs as BlogPostFirestore["faqs"];
      }

      let content = post.content;
      if (typeof patch.appendMarkdown === "string") {
        if (!content.includes("/booking")) {
          content = `${content.trim()}\n${patch.appendMarkdown}`;
        }
      }
      if (typeof patch.content === "string") content = patch.content;

      const nextPost: BlogPostFirestore = {
        ...post,
        title:
          typeof patch.title === "string" ? patch.title : post.title,
        metaTitle:
          typeof patch.metaTitle === "string"
            ? String(patch.metaTitle).slice(0, 70)
            : post.metaTitle,
        metaDescription:
          typeof patch.metaDescription === "string"
            ? String(patch.metaDescription).slice(0, 170)
            : post.metaDescription,
        excerpt:
          typeof patch.excerpt === "string"
            ? String(patch.excerpt).slice(0, 200)
            : post.excerpt,
        keywords: Array.isArray(patch.keywords)
          ? (patch.keywords as string[])
          : post.keywords,
        content,
        faqs,
        readTime: estimateReadTime(content),
        updatedAt: now,
      };

      // Never change published/slug/prices via this path
      const payload = blogPostToFirestorePayload(nextPost);
      delete (payload as { published?: unknown }).published;
      delete (payload as { slug?: unknown }).slug;

      await db.collection(col).doc(docId).set(stripUndefinedDeep(payload), {
        merge: true,
      });
      revalidatePath(`/blog/${docId}`);
      revalidatePath("/blog");
    } else {
      const page = parseSeoPageFromFirestore(docId, before, {
        requirePublished: false,
      });
      if (!page) return { ok: false, error: "Could not parse guide page" };

      let bodyContent = page.bodyContent;
      if (typeof patch.appendMarkdown === "string") {
        if (!bodyContent.includes("/booking")) {
          bodyContent = `${bodyContent.trim()}\n${patch.appendMarkdown}`;
        }
      }
      if (typeof patch.bodyContent === "string") {
        bodyContent = patch.bodyContent;
      } else if (typeof patch.content === "string") {
        bodyContent = patch.content;
      }

      const nextPage = {
        ...page,
        headline:
          typeof patch.headline === "string"
            ? patch.headline
            : typeof patch.title === "string"
              ? patch.title
              : page.headline,
        metaTitle:
          typeof patch.metaTitle === "string"
            ? String(patch.metaTitle).slice(0, 70)
            : page.metaTitle,
        metaDescription:
          typeof patch.metaDescription === "string"
            ? String(patch.metaDescription).slice(0, 170)
            : page.metaDescription,
        keywords: Array.isArray(patch.keywords)
          ? (patch.keywords as string[])
          : page.keywords,
        bodyContent,
        updatedAt: now,
      };

      const payload = seoPageToFirestorePayload(nextPage);
      // Preserve bookingOption / published / slug
      delete (payload as { bookingOption?: unknown }).bookingOption;
      delete (payload as { published?: unknown }).published;
      delete (payload as { slug?: unknown }).slug;

      await db.collection(col).doc(docId).set(stripUndefinedDeep(payload), {
        merge: true,
      });
      revalidatePath(`/guides/${docId}`);
      revalidatePath("/guides");
    }

    const afterSnap = await db.collection(col).doc(docId).get();
    const after = (afterSnap.data() || {}) as Record<string, unknown>;
    const versionId = `cv_${suggestion.id}_${Date.now()}`;
    await saveChangeVersion({
      id: versionId,
      pageId: `${col}/${docId}`,
      suggestionId: suggestion.id,
      collection: col,
      docId,
      beforeSnapshot: stripUndefinedDeep(before) as Record<string, unknown>,
      afterSnapshot: stripUndefinedDeep(after) as Record<string, unknown>,
      status: "applied",
      rollbackData: stripUndefinedDeep(before) as Record<string, unknown>,
      createdAt: now,
      rolledBackAt: null,
    });

    const updated = await saveSuggestion({
      ...suggestion,
      status: "applied",
      appliedAt: now,
      changeVersionId: versionId,
      rollbackAvailable: true,
      applyError: null,
    });

    await appendSeoIntelLog({
      action: "suggestions.apply",
      entityType: "suggestion",
      entityId: suggestion.id,
      actor: input.actor,
      details: `Applied ${suggestion.type} → ${col}/${docId}`,
      result: "ok",
    });

    return { ok: true, suggestion: updated };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Apply failed";
    await saveSuggestion({
      ...suggestion,
      status: "failed",
      applyError: msg,
    });
    await appendSeoIntelLog({
      action: "suggestions.apply",
      entityType: "suggestion",
      entityId: suggestion.id,
      actor: input.actor,
      details: msg,
      result: "error",
      error: msg,
    });
    return { ok: false, error: msg };
  }
}

function parseContentPath(path: string): {
  collection: "blogPosts" | "seoPages";
  docId: string;
} | null {
  const p = path.replace(/^https?:\/\/[^/]+/i, "").split("?")[0];
  if (p.startsWith("/blog/")) {
    const docId = p.slice("/blog/".length).replace(/\/$/, "");
    return docId ? { collection: "blogPosts", docId } : null;
  }
  if (p.startsWith("/guides/")) {
    const docId = p.slice("/guides/".length).replace(/\/$/, "");
    return docId ? { collection: "seoPages", docId } : null;
  }
  return null;
}

/**
 * Cannibalisation fix: append primary-page links on competing blogs/guides.
 * Never deletes pages. Service pages are link targets only (not rewritten).
 */
async function applyCannibalInternalLinks(
  suggestion: SeoIntelSuggestion,
  actor: string,
): Promise<
  | { ok: true; suggestion: SeoIntelSuggestion }
  | { ok: false; error: string }
> {
  const db = getAdminDb();
  if (!db) return { ok: false, error: "Server not configured" };

  const patch = suggestion.proposedPatch || {};
  const primaryUrl = String(patch.primaryUrl || suggestion.targetUrl || "").trim();
  const linkFromPaths = Array.isArray(patch.linkFromPaths)
    ? (patch.linkFromPaths as string[]).filter(Boolean)
    : [];
  const appendMarkdown = String(
    patch.appendMarkdown ||
      `\n\n### Related experience\nSee: [${primaryUrl}](${primaryUrl})\n`,
  );

  if (!primaryUrl) {
    return { ok: false, error: "Missing primary URL for cannibalisation fix" };
  }
  if (linkFromPaths.length === 0) {
    return {
      ok: false,
      error:
        "No competing blog/guide pages to update. Primary may already be the only editable page — handle service clusters manually if needed.",
    };
  }

  const now = new Date().toISOString();
  const docsBefore: {
    collection: "blogPosts" | "seoPages";
    docId: string;
    before: Record<string, unknown>;
  }[] = [];
  let updatedCount = 0;
  let skippedCount = 0;

  for (const path of linkFromPaths) {
    const parsed = parseContentPath(path);
    if (!parsed) {
      skippedCount += 1;
      continue;
    }
    const snap = await db.collection(parsed.collection).doc(parsed.docId).get();
    if (!snap.exists) {
      skippedCount += 1;
      continue;
    }
    const before = (snap.data() || {}) as Record<string, unknown>;

    if (parsed.collection === "blogPosts") {
      const post = parseBlogPostFromFirestore(parsed.docId, before, {
        requirePublished: false,
      });
      if (!post) {
        skippedCount += 1;
        continue;
      }
      if (post.content.includes(primaryUrl)) {
        skippedCount += 1;
        continue;
      }
      docsBefore.push({
        collection: parsed.collection,
        docId: parsed.docId,
        before: stripUndefinedDeep(before) as Record<string, unknown>,
      });
      const content = `${post.content.trim()}\n${appendMarkdown}`;
      const next: BlogPostFirestore = {
        ...post,
        content,
        readTime: estimateReadTime(content),
        updatedAt: now,
      };
      const payload = blogPostToFirestorePayload(next);
      delete (payload as { published?: unknown }).published;
      delete (payload as { slug?: unknown }).slug;
      await db
        .collection("blogPosts")
        .doc(parsed.docId)
        .set(stripUndefinedDeep(payload), { merge: true });
      revalidatePath(`/blog/${parsed.docId}`);
      updatedCount += 1;
    } else {
      const page = parseSeoPageFromFirestore(parsed.docId, before, {
        requirePublished: false,
      });
      if (!page) {
        skippedCount += 1;
        continue;
      }
      if (page.bodyContent.includes(primaryUrl)) {
        skippedCount += 1;
        continue;
      }
      docsBefore.push({
        collection: parsed.collection,
        docId: parsed.docId,
        before: stripUndefinedDeep(before) as Record<string, unknown>,
      });
      const bodyContent = `${page.bodyContent.trim()}\n${appendMarkdown}`;
      const payload = seoPageToFirestorePayload({
        ...page,
        bodyContent,
        updatedAt: now,
      });
      delete (payload as { bookingOption?: unknown }).bookingOption;
      delete (payload as { published?: unknown }).published;
      delete (payload as { slug?: unknown }).slug;
      await db
        .collection("seoPages")
        .doc(parsed.docId)
        .set(stripUndefinedDeep(payload), { merge: true });
      revalidatePath(`/guides/${parsed.docId}`);
      updatedCount += 1;
    }
  }

  if (updatedCount === 0) {
    return {
      ok: false,
      error:
        skippedCount > 0
          ? "All competing pages already link to the primary URL (or were not editable)."
          : "Nothing to update",
    };
  }

  revalidatePath("/blog");
  revalidatePath("/guides");

  const versionId = `cv_${suggestion.id}_${Date.now()}`;
  const first = docsBefore[0];
  await saveChangeVersion({
    id: versionId,
    pageId: `multi:${updatedCount}`,
    suggestionId: suggestion.id,
    collection: first?.collection || "blogPosts",
    docId: first?.docId || "multi",
    beforeSnapshot: { docs: docsBefore.length },
    afterSnapshot: {
      primaryUrl,
      updatedCount,
      paths: linkFromPaths,
    },
    status: "applied",
    rollbackData: {
      multi: true,
      docs: docsBefore,
    },
    createdAt: now,
    rolledBackAt: null,
  });

  const updated = await saveSuggestion({
    ...suggestion,
    status: "applied",
    appliedAt: now,
    changeVersionId: versionId,
    rollbackAvailable: true,
    applyError: null,
    adminNotes: `${suggestion.adminNotes || ""}\nCannibal fix: linked ${updatedCount} page(s) → ${primaryUrl} (skipped ${skippedCount}). No deletes.`.trim(),
  });

  await appendSeoIntelLog({
    action: "suggestions.apply",
    entityType: "suggestion",
    entityId: suggestion.id,
    actor,
    details: `Cannibal links: ${updatedCount} pages → ${primaryUrl}`,
    result: "ok",
  });

  return { ok: true, suggestion: updated };
}

async function applyCreateBlogDraft(
  suggestion: SeoIntelSuggestion,
): Promise<
  | { ok: true; suggestion: SeoIntelSuggestion }
  | { ok: false; error: string }
> {
  const db = getAdminDb();
  if (!db) return { ok: false, error: "Server not configured" };
  const patch = suggestion.proposedPatch;
  if (!patch) return { ok: false, error: "Missing draft patch" };
  const slug = String(patch.slug || suggestion.targetDocId || "").trim();
  if (!slug) return { ok: false, error: "Missing slug" };

  const existing = await db.collection("blogPosts").doc(slug).get();
  if (existing.exists) {
    return {
      ok: false,
      error: `Blog slug already exists: ${slug}. Edit or choose another URL.`,
    };
  }

  const now = new Date().toISOString();
  const title = String(patch.title || suggestion.keyword);
  const content = String(patch.content || suggestion.proposedValue);
  const post: BlogPostFirestore = {
    slug,
    title,
    excerpt: String(patch.excerpt || "").slice(0, 200),
    date: now.slice(0, 10),
    readTime: estimateReadTime(content),
    keywords: Array.isArray(patch.keywords)
      ? (patch.keywords as string[])
      : [suggestion.keyword],
    content,
    metaTitle: String(patch.metaTitle || title).slice(0, 70),
    metaDescription: String(patch.metaDescription || "").slice(0, 170),
    faqs: Array.isArray(patch.faqs)
      ? (patch.faqs as BlogPostFirestore["faqs"])
      : [],
    featuredImageUrl: "",
    ogImageUrl: "",
    language: "en",
    published: false,
    source: "auto",
    serviceSlug: "scuba-diving",
    pillar: false,
    createdAt: now,
    updatedAt: now,
  };

  const payload = blogPostToFirestorePayload(post);
  await db.collection("blogPosts").doc(slug).set(stripUndefinedDeep(payload));

  // Do not revalidate as public until published
  const versionId = `cv_${suggestion.id}_${Date.now()}`;
  await saveChangeVersion({
    id: versionId,
    pageId: `blogPosts/${slug}`,
    suggestionId: suggestion.id,
    collection: "blogPosts",
    docId: slug,
    beforeSnapshot: {},
    afterSnapshot: stripUndefinedDeep(payload) as Record<string, unknown>,
    status: "applied",
    rollbackData: { created: true, slug },
    createdAt: now,
    rolledBackAt: null,
  });

  const updated = await saveSuggestion({
    ...suggestion,
    status: "applied",
    appliedAt: now,
    targetCollection: "blogPosts",
    targetDocId: slug,
    targetUrl: `/blog/${slug}`,
    changeVersionId: versionId,
    rollbackAvailable: true,
    applyError: null,
    adminNotes: `${suggestion.adminNotes || ""}\nCreated unpublished draft — publish from Blog posts when ready.`.trim(),
  });

  await appendSeoIntelLog({
    action: "suggestions.apply",
    entityType: "suggestion",
    entityId: suggestion.id,
    actor: "system",
    details: `Created unpublished blog draft ${slug}`,
    result: "ok",
  });

  return { ok: true, suggestion: updated };
}

export async function rollbackSuggestionChange(input: {
  changeVersionId: string;
  actor: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const version = await getChangeVersion(input.changeVersionId);
  if (!version) return { ok: false, error: "Change version not found" };
  if (version.status === "rolled_back") {
    return { ok: false, error: "Already rolled back" };
  }

  const db = getAdminDb();
  if (!db) return { ok: false, error: "Server not configured" };

  const rb = version.rollbackData as {
    created?: boolean;
    multi?: boolean;
    docs?: {
      collection: "blogPosts" | "seoPages";
      docId: string;
      before: Record<string, unknown>;
    }[];
  } | null;
  const createdFlag = Boolean(rb?.created);

  try {
    if (createdFlag) {
      await db.collection(version.collection).doc(version.docId).delete();
    } else if (rb?.multi && Array.isArray(rb.docs)) {
      for (const doc of rb.docs) {
        await db
          .collection(doc.collection)
          .doc(doc.docId)
          .set(stripUndefinedDeep(doc.before), { merge: false });
        if (doc.collection === "blogPosts") {
          revalidatePath(`/blog/${doc.docId}`);
        } else {
          revalidatePath(`/guides/${doc.docId}`);
        }
      }
      revalidatePath("/blog");
      revalidatePath("/guides");
    } else if (version.rollbackData && Object.keys(version.rollbackData).length) {
      await db
        .collection(version.collection)
        .doc(version.docId)
        .set(stripUndefinedDeep(version.rollbackData), { merge: false });
      if (version.collection === "blogPosts") {
        revalidatePath(`/blog/${version.docId}`);
        revalidatePath("/blog");
      } else {
        revalidatePath(`/guides/${version.docId}`);
        revalidatePath("/guides");
      }
    } else {
      return { ok: false, error: "No rollback data" };
    }

    await saveChangeVersion({
      ...version,
      status: "rolled_back",
      rolledBackAt: new Date().toISOString(),
    });

    const sug = await getSuggestion(version.suggestionId);
    if (sug) {
      await saveSuggestion({
        ...sug,
        status: "rolled_back",
        applyError: null,
      });
    }

    await appendSeoIntelLog({
      action: "suggestions.rollback",
      entityType: "change_version",
      entityId: version.id,
      actor: input.actor,
      details: `Rolled back ${version.collection}/${version.docId}`,
      result: "ok",
    });

    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Rollback failed",
    };
  }
}

/** Apply all auto_approved / approved suggestions that are applyable. */
export async function processApprovedSuggestions(opts?: {
  actor?: string;
  limit?: number;
}): Promise<{ applied: number; failed: number; errors: string[] }> {
  const { listSuggestions } = await import("./suggestions-store");
  const rows = await listSuggestions({
    status: ["approved", "auto_approved"],
  });
  const limit = opts?.limit ?? 10;
  let applied = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const row of rows.slice(0, limit)) {
    if (!APPLYABLE.has(row.type) || !row.proposedPatch) continue;
    const res = await applySuggestion({
      id: row.id,
      actor: opts?.actor ?? "system",
    });
    if (res.ok) applied += 1;
    else {
      failed += 1;
      errors.push(`${row.id}: ${res.error}`);
    }
  }
  return { applied, failed, errors };
}
