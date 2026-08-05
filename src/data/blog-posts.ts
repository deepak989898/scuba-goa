import type { BlogPost } from "./blog/post-types";
export type { BlogPost, BlogFaq } from "./blog/post-types";

/**
 * Legacy code/static blogs removed — all public posts come from Firestore
 * (`blogPosts`). Kept as an empty list so older helpers stay import-safe.
 */
export const blogPosts: BlogPost[] = [];

/** Pillar URLs for homepage preview and blog index ordering (Goa scuba SEO cluster) */
export const SEO_PILLAR_SLUGS = [
  "best-time-for-scuba-diving-in-goa",
  "is-scuba-diving-safe",
  "scuba-diving-with-island-trip-goa",
  "scuba-diving-price-guide-2026",
] as const;

/**
 * Homepage “packages” strip — one guide per product line so cards aren’t
 * all scuba-only, and images can come from each service package.
 */
export const HOMEPAGE_PACKAGE_GUIDES = [
  {
    slug: "scuba-diving-with-island-trip-goa",
    packageLabel: "Scuba + Island",
    serviceSlug: "scuba-diving",
  },
  {
    slug: "cheap-water-sports-goa",
    packageLabel: "Water Sports",
    serviceSlug: "water-sports",
  },
  {
    slug: "dudhsagar-trip-guide",
    packageLabel: "Dudhsagar Trip",
    serviceSlug: "dudhsagar-trip",
  },
] as const;

export function blogPostsPillarFirst(): BlogPost[] {
  return [];
}

export function getPostBySlug(_slug: string): BlogPost | undefined {
  return undefined;
}

/** Related links — code blogs removed; use getRelatedBlogPostsMerged instead. */
export function getRelatedBlogPosts(_currentSlug: string, _limit = 3): BlogPost[] {
  return [];
}
