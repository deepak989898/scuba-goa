/**
 * Ranking opportunity content improve — OpenAI text only (no images).
 * Blog + guide pages only; static/service pages are rejected.
 */

import { revalidatePath } from "next/cache";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  blogPostToFirestorePayload,
  parseBlogPostFromFirestore,
  type BlogPostFirestore,
} from "@/lib/blog-firestore";
import {
  parseSeoPageFromFirestore,
  seoPageToFirestorePayload,
  type SeoPageFirestore,
} from "@/lib/seo-page-firestore";
import { buildBlogCatalogContext } from "@/lib/blog-automation/catalog-context";
import type { BlogFaq } from "@/data/blog/post-types";
import type { SeoUrlRecord } from "./types";
import { getSeoUrl, logAction, upsertSeoUrl } from "./store";
import {
  normalizeSiteUrl,
  siteOrigin,
  urlIdFromNormalized,
} from "./normalize-url";

export type RankingImproveFields = {
  title: string;
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
  keywords: string[];
  content: string;
  faqs: BlogFaq[];
  headline?: string;
  bodyContent?: string;
  /** Guide images — optional; omitted leaves existing images unchanged. */
  ogImageUrl?: string;
  heroImageUrl?: string;
  bookingOption?: string;
  published?: boolean;
};

export type RankingImproveMeta = {
  at: string;
  estimatedPct: number;
  targetBand: string;
  checklist: string[];
  summary: string;
  rankingStatus: string;
};

export type EditablePagePayload = {
  urlId: string;
  url: string;
  pageType: "blog" | "guide";
  slug: string;
  rankingStatus: string;
  averagePosition: number;
  impressions: number;
  clicks: number;
  fields: RankingImproveFields;
  /** Full blog doc for the shared BlogPostEditorPanel */
  blogPost: BlogPostFirestore | null;
  /** Full guide doc for GuideEditorPanel */
  guidePage: SeoPageFirestore | null;
  lastImprove: RankingImproveMeta | null;
  guidance: {
    headline: string;
    bullets: string[];
    color: string;
  };
};

function estimateReadTime(content: string): string {
  const words = content.split(/\s+/).filter(Boolean).length;
  const mins = Math.max(4, Math.min(14, Math.ceil(words / 200)));
  return `${mins} min read`;
}

/** Heuristic SEO upside estimate — not a Google guarantee. */
export function estimateImprovementPct(
  rankingStatus: string,
  averagePosition: number,
): { estimatedPct: number; targetBand: string; summary: string } {
  const pos = Number(averagePosition) || 0;
  switch (rankingStatus) {
    case "POSITION_11_TO_20": {
      const pct = Math.round(Math.min(32, Math.max(18, 28 - (pos - 11) * 0.8)));
      return {
        estimatedPct: pct,
        targetBand: "POSITION_4_TO_10 (page 1)",
        summary: `Title refresh + internal links + content update can help move toward page 1 (~positions 4–10). Estimated uplift ~${pct}% (not guaranteed).`,
      };
    }
    case "POSITION_4_TO_10": {
      const pct = Math.round(Math.min(20, Math.max(10, 18 - (pos - 4))));
      return {
        estimatedPct: pct,
        targetBand: "POSITION_1_TO_3",
        summary: `CTR-focused title/meta and stronger booking links can help climb toward top-3. Estimated uplift ~${pct}%.`,
      };
    }
    case "IMPRESSIONS_NO_CLICKS":
      return {
        estimatedPct: 32,
        targetBand: "clicks + better CTR",
        summary:
          "Title and meta rewrite targets more clicks from existing impressions. Estimated CTR uplift ~32%.",
      };
    case "LOW_CTR":
      return {
        estimatedPct: 26,
        targetBand: "higher CTR",
        summary:
          "Clearer SERP title/description and stronger intent match. Estimated CTR uplift ~26%.",
      };
    case "DECLINING":
    case "LOST_TRAFFIC":
      return {
        estimatedPct: 20,
        targetBand: "recover ranking",
        summary:
          "Refresh outdated sections and reinforce internal links. Estimated recovery uplift ~20%.",
      };
    default:
      return {
        estimatedPct: 14,
        targetBand: "stronger relevance",
        summary:
          "Content refresh and internal links may improve relevance. Estimated uplift ~14%.",
      };
  }
}

export function improvementGuidance(rankingStatus: string): {
  headline: string;
  bullets: string[];
  color: string;
} {
  if (rankingStatus === "POSITION_11_TO_20") {
    return {
      headline: "POSITION 11–20 वाले blogs / guides",
      bullets: [
        "Title refresh (click-worthy, accurate)",
        "Internal links → /services/… and /booking",
        "पुराना content अपडेट — fresher answers, clearer structure",
        "After generate, position may move toward 4–10 (page 1) over time — not guaranteed",
      ],
      color: "amber",
    };
  }
  if (rankingStatus === "POSITION_4_TO_10") {
    return {
      headline: "POSITION 4–10 — almost page-top",
      bullets: [
        "Sharper title/meta for CTR",
        "Stronger booking/service CTAs",
        "Fill intent gaps competitors cover",
      ],
      color: "cyan",
    };
  }
  if (rankingStatus === "IMPRESSIONS_NO_CLICKS" || rankingStatus === "LOW_CTR") {
    return {
      headline: "Impressions without clicks / low CTR",
      bullets: [
        "Rewrite title + meta for the query",
        "Lead with a direct answer in the first paragraph",
        "Add clear Book now path",
      ],
      color: "rose",
    };
  }
  return {
    headline: "Ranking opportunity — content improve",
    bullets: [
      "Refresh title and meta",
      "Add internal links to services/booking",
      "Update outdated sections",
    ],
    color: "ocean",
  };
}

function assertEditable(
  record: SeoUrlRecord,
): asserts record is SeoUrlRecord & { pageType: "blog" | "guide" } {
  if (record.pageType !== "blog" && record.pageType !== "guide") {
    throw new Error(
      "Generate/Edit is only for blog and guide pages (not static).",
    );
  }
  if (!record.contentId?.trim()) {
    throw new Error("Missing contentId / slug for this URL.");
  }
}

export async function loadEditablePage(
  urlId: string,
): Promise<EditablePagePayload> {
  const record = await getSeoUrl(urlId);
  if (!record) throw new Error("URL not found in inventory");
  assertEditable(record);

  const db = getAdminDb();
  if (!db) throw new Error("Server not configured");

  const slug = record.contentId.trim();
  let fields: RankingImproveFields;
  let blogPost: BlogPostFirestore | null = null;
  let guidePage: SeoPageFirestore | null = null;

  if (record.pageType === "blog") {
    const snap = await db.collection("blogPosts").doc(slug).get();
    if (!snap.exists) throw new Error(`Blog not found: ${slug}`);
    const post = parseBlogPostFromFirestore(
      slug,
      snap.data() as Record<string, unknown>,
      { requirePublished: false },
    );
    if (!post) throw new Error(`Could not parse blog: ${slug}`);
    blogPost = post;
    fields = {
      title: post.title,
      metaTitle: post.metaTitle || post.title,
      metaDescription: post.metaDescription,
      excerpt: post.excerpt,
      keywords: post.keywords,
      content: post.content,
      faqs: post.faqs ?? [],
    };
  } else {
    const snap = await db.collection("seoPages").doc(slug).get();
    if (!snap.exists) throw new Error(`Guide not found: ${slug}`);
    const page = parseSeoPageFromFirestore(
      slug,
      snap.data() as Record<string, unknown>,
      { requirePublished: false },
    );
    if (!page) throw new Error(`Could not parse guide: ${slug}`);
    guidePage = page;
    fields = {
      title: page.headline,
      headline: page.headline,
      metaTitle: page.metaTitle || page.headline,
      metaDescription: page.metaDescription,
      excerpt: page.metaDescription.slice(0, 160),
      keywords: page.keywords,
      content: page.bodyContent,
      bodyContent: page.bodyContent,
      faqs: [],
      ogImageUrl: page.ogImageUrl,
      heroImageUrl: page.heroImageUrl,
      bookingOption: page.bookingOption,
      published: page.published,
    };
  }

  const lastImprove = record.lastRankingImprove ?? null;

  return {
    urlId: record.id,
    url: record.url,
    pageType: record.pageType,
    slug,
    rankingStatus: record.rankingStatus,
    averagePosition: record.averagePosition,
    impressions: record.impressions,
    clicks: record.clicks,
    fields,
    blogPost,
    guidePage,
    lastImprove,
    guidance: improvementGuidance(record.rankingStatus),
  };
}

async function callOpenAIImprove(input: {
  pageType: "blog" | "guide";
  slug: string;
  url: string;
  rankingStatus: string;
  averagePosition: number;
  impressions: number;
  clicks: number;
  current: RankingImproveFields;
  serviceSlug?: string;
  language?: string;
  catalog: string;
}): Promise<RankingImproveFields> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not configured");

  const year = new Date().getFullYear();
  const serviceHint =
    input.serviceSlug?.trim() ||
    "scuba-diving-goa";

  const system = `You are an expert SEO editor for Book Scuba Goa (scuba diving & water sports in Goa, India).
You IMPROVE existing ${input.pageType} content for Google ranking/CTR — text only. Never generate or mention images, hero art, or alt-text changes.

CRITICAL — never invent:
- Fake certifications, instructor names, review counts, dive counts, awards
- Fake scarcity (“slots left”, “booked today”)
- Exact depth/visibility guarantees — use typically / approximately / may vary
- Prices outside the OFFICIAL CATALOG

Improve for ranking status ${input.rankingStatus} (avg position ${input.averagePosition.toFixed(1)}, impressions ${input.impressions}, clicks ${input.clicks}):
1) Title refresh — compelling, accurate, max ~60 chars for metaTitle
2) Meta description 145–160 chars with clear CTA
3) Update outdated / thin sections; keep useful original facts that remain true
4) Add 5–8 internal markdown links using ONLY paths like [/booking](/booking), [/services/${serviceHint}](/services/${serviceHint}), [/blog](/blog), [/guides](/guides)
5) Keep the same public slug: ${input.slug} (do not change URL slug)
6) Markdown with ## / ### ; start with a 2–3 sentence direct answer
7) Year reference: ${year}

${input.catalog}

Return ONLY valid JSON:
{
  "title": string,
  "metaTitle": string,
  "metaDescription": string,
  "excerpt": string,
  "keywords": string[],
  "content": string,
  "faqs": [{"question": string, "answer": string}]
}`;

  const user = `Improve this ${input.pageType} page for better rankings/CTR.
URL: ${input.url}
Slug (keep): ${input.slug}
Language hint: ${input.language || "en"}

CURRENT TITLE: ${input.current.title}
CURRENT META TITLE: ${input.current.metaTitle}
CURRENT META DESCRIPTION: ${input.current.metaDescription}
CURRENT EXCERPT: ${input.current.excerpt}
CURRENT KEYWORDS: ${input.current.keywords.join(", ")}
CURRENT FAQs: ${JSON.stringify(input.current.faqs).slice(0, 2000)}

CURRENT BODY (markdown):
${input.current.content.slice(0, 12000)}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: 4500,
      temperature: 0.55,
      response_format: { type: "json_object" },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message ?? "OpenAI request failed");
  }

  const raw = data?.choices?.[0]?.message?.content?.trim();
  if (!raw) throw new Error("Empty OpenAI response");

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error("Invalid JSON from OpenAI");
  }

  const content = String(parsed.content ?? "").trim();
  if (!content || content.length < 400) {
    throw new Error("Generated content too short — try again");
  }

  const faqs: BlogFaq[] = [];
  if (Array.isArray(parsed.faqs)) {
    for (const f of parsed.faqs) {
      if (!f || typeof f !== "object") continue;
      const q = String((f as { question?: string }).question ?? "").trim();
      const a = String((f as { answer?: string }).answer ?? "").trim();
      if (q && a) faqs.push({ question: q, answer: a });
    }
  }

  const keywords = Array.isArray(parsed.keywords)
    ? parsed.keywords.map((k) => String(k).trim()).filter(Boolean)
    : input.current.keywords;

  const title = String(parsed.title ?? input.current.title).trim();
  return {
    title,
    metaTitle: String(parsed.metaTitle ?? title).trim().slice(0, 70),
    metaDescription: String(parsed.metaDescription ?? "").trim().slice(0, 160),
    excerpt: String(parsed.excerpt ?? "").trim().slice(0, 200),
    keywords,
    content,
    faqs: faqs.length ? faqs : input.current.faqs,
    headline: title,
    bodyContent: content,
  };
}

async function persistFields(
  record: SeoUrlRecord & { pageType: "blog" | "guide" },
  fields: RankingImproveFields,
  meta: RankingImproveMeta,
): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Server not configured");
  const slug = record.contentId.trim();
  const now = new Date().toISOString();

  if (record.pageType === "blog") {
    const ref = db.collection("blogPosts").doc(slug);
    const snap = await ref.get();
    if (!snap.exists) throw new Error(`Blog not found: ${slug}`);
    const current = parseBlogPostFromFirestore(
      slug,
      snap.data() as Record<string, unknown>,
      { requirePublished: false },
    );
    if (!current) throw new Error(`Could not parse blog: ${slug}`);

    const next: BlogPostFirestore = {
      ...current,
      title: fields.title,
      metaTitle: fields.metaTitle,
      metaDescription: fields.metaDescription,
      excerpt: fields.excerpt || current.excerpt,
      keywords: fields.keywords,
      content: fields.content,
      faqs: fields.faqs.length ? fields.faqs : current.faqs,
      readTime: estimateReadTime(fields.content),
      updatedAt: now,
      // Images intentionally unchanged
      featuredImageUrl: current.featuredImageUrl,
      featuredImageAlt: current.featuredImageAlt,
      ogImageUrl: current.ogImageUrl,
      imageMeta: current.imageMeta,
    };

    await ref.set(blogPostToFirestorePayload(next), { merge: true });
    revalidatePath(`/blog/${slug}`);
    revalidatePath("/blog");
  } else {
    const ref = db.collection("seoPages").doc(slug);
    const snap = await ref.get();
    if (!snap.exists) throw new Error(`Guide not found: ${slug}`);
    const current = parseSeoPageFromFirestore(
      slug,
      snap.data() as Record<string, unknown>,
      { requirePublished: false },
    );
    if (!current) throw new Error(`Could not parse guide: ${slug}`);

    const next: SeoPageFirestore = {
      ...current,
      headline: fields.headline || fields.title,
      metaTitle: fields.metaTitle,
      metaDescription: fields.metaDescription,
      keywords: fields.keywords,
      bodyContent: fields.bodyContent || fields.content,
      updatedAt: now,
      ogImageUrl:
        fields.ogImageUrl != null ? fields.ogImageUrl : current.ogImageUrl,
      heroImageUrl:
        fields.heroImageUrl != null ? fields.heroImageUrl : current.heroImageUrl,
      bookingOption:
        fields.bookingOption != null
          ? fields.bookingOption
          : current.bookingOption,
      published:
        typeof fields.published === "boolean"
          ? fields.published
          : current.published,
    };

    await ref.set(seoPageToFirestorePayload(next), { merge: true });
    revalidatePath(`/guides/${slug}`);
    revalidatePath("/guides");
  }

  await upsertSeoUrl({
    ...record,
    contentUpdatedAt: now,
    lastActionAt: now,
    updatedAt: now,
    recommendationCodes: Array.from(
      new Set([...(record.recommendationCodes || []), "RANKING_CONTENT_IMPROVED"]),
    ),
    lastRankingImprove: meta,
  });

  await logAction({
    urlId: record.id,
    url: record.url,
    action: "ranking_content_improve",
    detail: `${meta.estimatedPct}% est · ${meta.targetBand} · ${meta.summary.slice(0, 120)}`,
    ok: true,
  });
}

export async function generateAndApplyRankingImprove(urlId: string): Promise<{
  page: EditablePagePayload;
  improve: RankingImproveMeta;
}> {
  const record = await getSeoUrl(urlId);
  if (!record) throw new Error("URL not found in inventory");
  assertEditable(record);

  const loaded = await loadEditablePage(urlId);
  const catalog = await buildBlogCatalogContext();

  let serviceSlug = "";
  let language = "en";
  if (record.pageType === "blog") {
    const db = getAdminDb();
    const snap = await db?.collection("blogPosts").doc(record.contentId).get();
    const data = snap?.data();
    serviceSlug = String(data?.serviceSlug ?? "").trim();
    language = String(data?.language ?? "en");
  }

  const improved = await callOpenAIImprove({
    pageType: record.pageType,
    slug: loaded.slug,
    url: loaded.url,
    rankingStatus: loaded.rankingStatus,
    averagePosition: loaded.averagePosition,
    impressions: loaded.impressions,
    clicks: loaded.clicks,
    current: loaded.fields,
    serviceSlug,
    language,
    catalog: catalog.textBlock,
  });

  const est = estimateImprovementPct(
    loaded.rankingStatus,
    loaded.averagePosition,
  );
  const guidance = improvementGuidance(loaded.rankingStatus);
  const meta: RankingImproveMeta = {
    at: new Date().toISOString(),
    estimatedPct: est.estimatedPct,
    targetBand: est.targetBand,
    checklist: guidance.bullets,
    summary: est.summary,
    rankingStatus: loaded.rankingStatus,
  };

  await persistFields(record, improved, meta);

  const page = await loadEditablePage(urlId);
  return { page, improve: meta };
}

export async function saveManualRankingEdit(
  urlId: string,
  patch: Partial<RankingImproveFields>,
): Promise<EditablePagePayload> {
  const record = await getSeoUrl(urlId);
  if (!record) throw new Error("URL not found in inventory");
  assertEditable(record);

  const loaded = await loadEditablePage(urlId);
  const fields: RankingImproveFields = {
    title: String(patch.title ?? loaded.fields.title).trim(),
    metaTitle: String(patch.metaTitle ?? loaded.fields.metaTitle).trim(),
    metaDescription: String(
      patch.metaDescription ?? loaded.fields.metaDescription,
    ).trim(),
    excerpt: String(patch.excerpt ?? loaded.fields.excerpt).trim(),
    keywords: Array.isArray(patch.keywords)
      ? patch.keywords.map((k) => String(k).trim()).filter(Boolean)
      : loaded.fields.keywords,
    content: String(patch.content ?? loaded.fields.content),
    faqs: Array.isArray(patch.faqs) ? patch.faqs : loaded.fields.faqs,
    headline: String(
      patch.headline ?? patch.title ?? loaded.fields.headline ?? loaded.fields.title,
    ).trim(),
    bodyContent: String(
      patch.bodyContent ?? patch.content ?? loaded.fields.bodyContent ?? loaded.fields.content,
    ),
    ...(patch.ogImageUrl != null ? { ogImageUrl: String(patch.ogImageUrl) } : {}),
    ...(patch.heroImageUrl != null
      ? { heroImageUrl: String(patch.heroImageUrl) }
      : {}),
    ...(patch.bookingOption != null
      ? { bookingOption: String(patch.bookingOption) }
      : {}),
    ...(typeof patch.published === "boolean"
      ? { published: patch.published }
      : {}),
  };

  if (!fields.title || fields.content.trim().length < 50) {
    throw new Error("Title and content are required");
  }

  const est = estimateImprovementPct(
    loaded.rankingStatus,
    loaded.averagePosition,
  );
  const guidance = improvementGuidance(loaded.rankingStatus);
  const prev = loaded.lastImprove;
  const meta: RankingImproveMeta = {
    at: new Date().toISOString(),
    estimatedPct: prev?.estimatedPct ?? est.estimatedPct,
    targetBand: prev?.targetBand ?? est.targetBand,
    checklist: guidance.bullets,
    summary: prev?.summary ?? `Manual edit saved. ${est.summary}`,
    rankingStatus: loaded.rankingStatus,
  };

  await persistFields(record, fields, meta);
  return loadEditablePage(urlId);
}

function blogImageSuggestions(post: BlogPostFirestore): string[] {
  const tips: string[] = [];
  const featured = post.featuredImageUrl?.trim() || "";
  const og = post.ogImageUrl?.trim() || "";
  if (!featured) {
    tips.push(
      "Featured image missing — upload a fresh WebP dive/beach photo (suggest only; Apply will not change images).",
    );
  } else {
    tips.push(
      "Keep featured image unless CTR is weak — optionally refresh with a clearer scuba/Baga photo (manual upload in Edit).",
    );
  }
  if (!og) {
    tips.push(
      "OG image empty — set social/SERP share image (can match featured). Suggest only.",
    );
  }
  const updatedMs = Date.parse(post.updatedAt || post.publishedAt || "");
  if (Number.isFinite(updatedMs) && Date.now() - updatedMs > 90 * 86400000) {
    tips.push(
      "Content last updated over 90 days ago — a newer hero image often helps CTR alongside text refresh.",
    );
  }
  if (tips.length === 0) {
    tips.push(
      "Images look OK — no auto image change. Use Edit → upload if you want a new photo.",
    );
  }
  return tips;
}

async function resolveBlogSeoUrlId(slug: string): Promise<string | null> {
  const abs = `${siteOrigin()}/blog/${slug.trim()}`;
  const norm = normalizeSiteUrl(abs);
  if (!norm) return null;
  const id = urlIdFromNormalized(norm);
  const record = await getSeoUrl(id);
  return record ? id : null;
}

export type BlogRankingSuggestResult = {
  slug: string;
  urlId: string | null;
  current: RankingImproveFields;
  suggestion: RankingImproveFields;
  /** Preview estimate for this suggestion (not saved until Apply). */
  previewImprove: RankingImproveMeta;
  /** Last applied improve from seoUrls, if any. */
  lastImprove: RankingImproveMeta | null;
  imageSuggestions: string[];
  blogUpdatedAt: string | null;
  guidance: ReturnType<typeof improvementGuidance>;
  gsc: {
    rankingStatus: string;
    averagePosition: number;
    impressions: number;
    clicks: number;
  };
};

/**
 * Suggest-only ranking update for a blog (title, meta, content, FAQs).
 * Does NOT write Firestore. Images are checklist suggestions only.
 */
export async function suggestBlogRankingUpdate(
  slugRaw: string,
): Promise<BlogRankingSuggestResult> {
  const slug = slugRaw.trim();
  if (!slug) throw new Error("slug required");

  const db = getAdminDb();
  if (!db) throw new Error("Server not configured");

  const snap = await db.collection("blogPosts").doc(slug).get();
  if (!snap.exists) throw new Error(`Blog not found: ${slug}`);
  const post = parseBlogPostFromFirestore(
    slug,
    snap.data() as Record<string, unknown>,
    { requirePublished: false },
  );
  if (!post) throw new Error(`Could not parse blog: ${slug}`);

  const urlId = await resolveBlogSeoUrlId(slug);
  const record = urlId ? await getSeoUrl(urlId) : null;

  const rankingStatus = record?.rankingStatus || "NEW_NO_DATA";
  const averagePosition = Number(record?.averagePosition) || 0;
  const impressions = Math.max(0, Math.round(Number(record?.impressions) || 0));
  const clicks = Math.max(0, Math.round(Number(record?.clicks) || 0));

  const current: RankingImproveFields = {
    title: post.title,
    metaTitle: post.metaTitle || post.title,
    metaDescription: post.metaDescription,
    excerpt: post.excerpt,
    keywords: post.keywords,
    content: post.content,
    faqs: post.faqs ?? [],
  };

  const catalog = await buildBlogCatalogContext();
  const suggestion = await callOpenAIImprove({
    pageType: "blog",
    slug,
    url: record?.url || `${siteOrigin()}/blog/${slug}`,
    rankingStatus,
    averagePosition,
    impressions,
    clicks,
    current,
    serviceSlug: post.serviceSlug,
    language: post.language,
    catalog: catalog.textBlock,
  });

  const est = estimateImprovementPct(rankingStatus, averagePosition);
  const guidance = improvementGuidance(rankingStatus);
  const previewImprove: RankingImproveMeta = {
    at: new Date().toISOString(),
    estimatedPct: est.estimatedPct,
    targetBand: est.targetBand,
    checklist: [
      ...guidance.bullets,
      "FAQs refreshed for People Also Ask / long-tail",
      "Title + meta tuned for GSC CTR",
      "Images: suggestions only — Apply does not change photos",
    ],
    summary: est.summary,
    rankingStatus,
  };

  return {
    slug,
    urlId,
    current,
    suggestion,
    previewImprove,
    lastImprove: record?.lastRankingImprove ?? null,
    imageSuggestions: blogImageSuggestions(post),
    blogUpdatedAt: post.updatedAt || post.publishedAt || null,
    guidance,
    gsc: { rankingStatus, averagePosition, impressions, clicks },
  };
}

/**
 * Apply a previously reviewed suggestion to the blog (text/FAQs only).
 * Images are never changed.
 */
export async function applyBlogRankingUpdate(
  slugRaw: string,
  fieldsIn: RankingImproveFields,
): Promise<{ slug: string; improve: RankingImproveMeta }> {
  const slug = slugRaw.trim();
  if (!slug) throw new Error("slug required");
  if (!fieldsIn.title?.trim() || fieldsIn.content.trim().length < 50) {
    throw new Error("Title and content are required");
  }

  const db = getAdminDb();
  if (!db) throw new Error("Server not configured");

  const urlId = await resolveBlogSeoUrlId(slug);
  const record = urlId ? await getSeoUrl(urlId) : null;

  const rankingStatus = record?.rankingStatus || "NEW_NO_DATA";
  const averagePosition = Number(record?.averagePosition) || 0;
  const est = estimateImprovementPct(rankingStatus, averagePosition);
  const guidance = improvementGuidance(rankingStatus);
  const meta: RankingImproveMeta = {
    at: new Date().toISOString(),
    estimatedPct: est.estimatedPct,
    targetBand: est.targetBand,
    checklist: guidance.bullets,
    summary: est.summary,
    rankingStatus,
  };

  const fields: RankingImproveFields = {
    title: String(fieldsIn.title).trim(),
    metaTitle: String(fieldsIn.metaTitle || fieldsIn.title).trim().slice(0, 70),
    metaDescription: String(fieldsIn.metaDescription || "").trim().slice(0, 160),
    excerpt: String(fieldsIn.excerpt || "").trim().slice(0, 200),
    keywords: Array.isArray(fieldsIn.keywords)
      ? fieldsIn.keywords.map((k) => String(k).trim()).filter(Boolean)
      : [],
    content: String(fieldsIn.content),
    faqs: Array.isArray(fieldsIn.faqs) ? fieldsIn.faqs : [],
  };

  if (record && (record.pageType === "blog" || record.pageType === "guide")) {
    assertEditable(record);
    await persistFields(record, fields, meta);
  } else {
    const ref = db.collection("blogPosts").doc(slug);
    const snap = await ref.get();
    if (!snap.exists) throw new Error(`Blog not found: ${slug}`);
    const current = parseBlogPostFromFirestore(
      slug,
      snap.data() as Record<string, unknown>,
      { requirePublished: false },
    );
    if (!current) throw new Error(`Could not parse blog: ${slug}`);
    const now = meta.at;
    const next: BlogPostFirestore = {
      ...current,
      title: fields.title,
      metaTitle: fields.metaTitle,
      metaDescription: fields.metaDescription,
      excerpt: fields.excerpt || current.excerpt,
      keywords: fields.keywords,
      content: fields.content,
      faqs: fields.faqs.length ? fields.faqs : current.faqs,
      readTime: estimateReadTime(fields.content),
      updatedAt: now,
      featuredImageUrl: current.featuredImageUrl,
      featuredImageAlt: current.featuredImageAlt,
      ogImageUrl: current.ogImageUrl,
      imageMeta: current.imageMeta,
    };
    await ref.set(blogPostToFirestorePayload(next), { merge: true });
    revalidatePath(`/blog/${slug}`);
    revalidatePath("/blog");
  }

  return { slug, improve: meta };
}
