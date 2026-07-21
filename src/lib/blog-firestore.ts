/**
 * Firestore `blogPosts` — auto + manual SEO blogs at `/blog/[slug]`.
 * Document ID = slug.
 */

import type { BlogFaq } from "@/data/blog/post-types";

export type BlogLanguage = "en" | "hi" | "hinglish";

export type BlogPostFirestore = {
  slug: string;
  title: string;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  content: string;
  faqs: BlogFaq[];
  date: string;
  updatedAt: string;
  readTime: string;
  featuredImageUrl: string;
  /** Descriptive ALT for featured image (SEO + accessibility). */
  featuredImageAlt?: string;
  ogImageUrl: string;
  /** Topic-aware AI image metadata (optional; older posts may omit). */
  imageMeta?: {
    visualCategory?: string;
    compositionSignature?: string;
    generatedPrompt?: string;
    generationModel?: string;
    sha256?: string;
    perceptualHash?: string;
    differenceHash?: string;
    promptHash?: string;
    relevanceScore?: number;
    uniquenessScore?: number;
    qualityScore?: number;
    safetyScore?: number;
    overallImageScore?: number;
    validationNotes?: string[];
    imageStatus?: "approved" | "needs_manual_review" | "rejected" | "generated";
    imageTitle?: string;
    imageCaption?: string;
    width?: number;
    height?: number;
    mimeType?: string;
    fileSize?: number;
    source?: string;
    brandingApplied?: boolean;
    history?: Array<{
      imageUrl: string;
      sha256?: string;
      createdAt: string;
      reason?: string;
    }>;
  };
  /** Optional stored JSON-LD Article/BlogPosting schema. */
  schemaMarkup?: Record<string, unknown>;
  language: BlogLanguage;
  published: boolean;
  source: "auto" | "manual";
  serviceSlug: string;
  pillar: boolean;
  createdAt: string;
  publishedAt?: string;
  /** IST calendar day for this slot (YYYY-MM-DD). */
  scheduleDateIst?: string;
  /** IST time slot label e.g. 06:00 */
  publishSlotIst?: string;
  /** UTC ISO — auto-publish when cron time >= this */
  scheduledPublishAt?: string;
  localeGroupId?: string;
};

export function isBlogScheduled(post: BlogPostFirestore): boolean {
  return !post.published && Boolean(post.scheduledPublishAt?.trim());
}

export function normalizeBlogSlugInput(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

export function isValidBlogSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 3;
}

function parseKeywords(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((x) => String(x).trim()).filter(Boolean);
  }
  if (typeof raw === "string") {
    return raw
      .split(/[,|\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function parseFaqs(raw: unknown): BlogFaq[] {
  if (!Array.isArray(raw)) return [];
  const out: BlogFaq[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const q = String((item as { question?: string }).question ?? "").trim();
    const a = String((item as { answer?: string }).answer ?? "").trim();
    if (q && a) out.push({ question: q, answer: a });
  }
  return out;
}

export function parseBlogPostFromFirestore(
  docId: string,
  data: Record<string, unknown> | undefined,
  options: { requirePublished: boolean },
): BlogPostFirestore | null {
  if (!data) return null;
  if (options.requirePublished && data.published !== true) return null;
  if (options.requirePublished && !isValidBlogSlug(docId)) return null;

  const title = String(data.title ?? "").trim();
  if (options.requirePublished && !title) return null;

  const content = String(data.content ?? "").trim();
  const excerptRaw = String(data.excerpt ?? "").trim();
  const excerpt =
    excerptRaw ||
    (content ? content.replace(/\s+/g, " ").trim().slice(0, 158) : title);

  const langRaw = String(data.language ?? "hinglish").trim();
  const language: BlogLanguage =
    langRaw === "en" || langRaw === "hi" || langRaw === "hinglish"
      ? langRaw
      : "hinglish";

  return {
    slug: docId,
    title,
    excerpt,
    metaTitle: String(data.metaTitle ?? "").trim() || title,
    metaDescription:
      String(data.metaDescription ?? "").trim() || excerpt,
    keywords: parseKeywords(data.keywords),
    content,
    faqs: parseFaqs(data.faqs),
    date: String(data.date ?? new Date().toISOString().slice(0, 10)).trim(),
    updatedAt: String(data.updatedAt ?? new Date().toISOString()).trim(),
    readTime: String(data.readTime ?? "6 min read").trim(),
    featuredImageUrl: String(data.featuredImageUrl ?? "").trim(),
    featuredImageAlt:
      data.featuredImageAlt != null
        ? String(data.featuredImageAlt).trim()
        : undefined,
    ogImageUrl: String(data.ogImageUrl ?? data.featuredImageUrl ?? "").trim(),
    imageMeta:
      data.imageMeta && typeof data.imageMeta === "object"
        ? (data.imageMeta as BlogPostFirestore["imageMeta"])
        : undefined,
    schemaMarkup:
      data.schemaMarkup && typeof data.schemaMarkup === "object"
        ? (data.schemaMarkup as Record<string, unknown>)
        : undefined,
    language,
    published: data.published === true,
    source: data.source === "manual" ? "manual" : "auto",
    serviceSlug: String(data.serviceSlug ?? "").trim(),
    pillar: data.pillar === true,
    createdAt: String(data.createdAt ?? new Date().toISOString()).trim(),
    publishedAt:
      data.publishedAt != null ? String(data.publishedAt).trim() : undefined,
    scheduleDateIst:
      data.scheduleDateIst != null
        ? String(data.scheduleDateIst).trim()
        : undefined,
    publishSlotIst:
      data.publishSlotIst != null ? String(data.publishSlotIst).trim() : undefined,
    scheduledPublishAt:
      data.scheduledPublishAt != null
        ? String(data.scheduledPublishAt).trim()
        : undefined,
    localeGroupId:
      data.localeGroupId != null
        ? String(data.localeGroupId).trim()
        : undefined,
  };
}

export function blogPostToFirestorePayload(
  post: Omit<BlogPostFirestore, "updatedAt"> & { updatedAt?: string },
): Record<string, unknown> {
  const updatedAt = post.updatedAt ?? new Date().toISOString();
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    metaTitle: post.metaTitle,
    metaDescription: post.metaDescription,
    keywords: post.keywords,
    content: post.content,
    faqs: post.faqs,
    date: post.date,
    readTime: post.readTime,
    featuredImageUrl: post.featuredImageUrl,
    ...(post.featuredImageAlt ? { featuredImageAlt: post.featuredImageAlt } : {}),
    ogImageUrl: post.ogImageUrl,
    ...(post.imageMeta ? { imageMeta: post.imageMeta } : {}),
    ...(post.schemaMarkup ? { schemaMarkup: post.schemaMarkup } : {}),
    language: post.language,
    published: post.published,
    source: post.source,
    serviceSlug: post.serviceSlug,
    pillar: post.pillar,
    updatedAt,
    ...(post.createdAt ? { createdAt: post.createdAt } : {}),
    ...(post.publishedAt ? { publishedAt: post.publishedAt } : {}),
    ...(post.scheduleDateIst ? { scheduleDateIst: post.scheduleDateIst } : {}),
    ...(post.publishSlotIst ? { publishSlotIst: post.publishSlotIst } : {}),
    ...(post.scheduledPublishAt
      ? { scheduledPublishAt: post.scheduledPublishAt }
      : {}),
    ...(post.localeGroupId ? { localeGroupId: post.localeGroupId } : {}),
  };
}
