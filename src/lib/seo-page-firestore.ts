/**
 * Firestore `seoPages` — admin-managed SEO landing pages at `/guides/[slug]`.
 * Document ID should equal `slug` for stable URLs and uniqueness.
 */

export type SeoPageFirestore = {
  slug: string;
  /** Visible H1 on the page */
  headline: string;
  /** `<title>` and Open Graph title; falls back to headline if empty */
  metaTitle: string;
  /** Meta description + OG description */
  metaDescription: string;
  keywords: string[];
  /** Open Graph / Twitter image (absolute or site-relative URL) */
  ogImageUrl: string;
  /** Optional hero banner above body; falls back to og image */
  heroImageUrl: string;
  /** Same lightweight markup as blog — see `BlogContent` */
  bodyContent: string;
  /** Optional encoded booking target — `buildHeroBookingHref` */
  bookingOption: string;
  published: boolean;
  updatedAt: string;
  createdAt?: string;
};

function parseKeywordsField(raw: unknown): string[] {
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

export function normalizeSeoSlugInput(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

export function isValidSeoSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 2;
}

export function parseSeoPageFromFirestore(
  docId: string,
  data: Record<string, unknown> | undefined,
  options: { requirePublished: boolean },
): SeoPageFirestore | null {
  if (!data) return null;
  if (options.requirePublished && data.published !== true) return null;

  if (options.requirePublished && !isValidSeoSlug(docId)) return null;

  const headlineRaw = String(data.headline ?? "").trim();
  if (options.requirePublished && !headlineRaw) return null;
  const headline =
    headlineRaw || "(Untitled — edit in admin)";

  const metaTitle = String(data.metaTitle ?? "").trim();
  const metaDescriptionRaw = String(data.metaDescription ?? "").trim();
  const bodyContent = String(data.bodyContent ?? "").trim();
  const metaDescription =
    metaDescriptionRaw ||
    (bodyContent
      ? bodyContent.replace(/\s+/g, " ").trim().slice(0, 158)
      : headline);

  return {
    /** Document id is the canonical public URL segment. */
    slug: docId,
    headline,
    metaTitle,
    metaDescription,
    keywords: parseKeywordsField(data.keywords),
    ogImageUrl: String(data.ogImageUrl ?? "").trim(),
    heroImageUrl: String(data.heroImageUrl ?? "").trim(),
    bodyContent,
    bookingOption: String(data.bookingOption ?? "").trim(),
    published: data.published === true,
    updatedAt: String(data.updatedAt ?? new Date().toISOString()).trim(),
    createdAt:
      data.createdAt != null
        ? String(data.createdAt).trim()
        : undefined,
  };
}

export function seoPageToFirestorePayload(
  page: Omit<SeoPageFirestore, "updatedAt"> & { updatedAt?: string },
): Record<string, unknown> {
  const updatedAt = page.updatedAt ?? new Date().toISOString();
  return {
    slug: page.slug,
    headline: page.headline,
    metaTitle: page.metaTitle,
    metaDescription: page.metaDescription,
    keywords: page.keywords,
    ogImageUrl: page.ogImageUrl,
    heroImageUrl: page.heroImageUrl,
    bodyContent: page.bodyContent,
    bookingOption: page.bookingOption,
    published: page.published,
    updatedAt,
    ...(page.createdAt ? { createdAt: page.createdAt } : {}),
  };
}
