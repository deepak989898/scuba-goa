import type { BlogPost } from "./blog/post-types";
export type { BlogPost, BlogFaq } from "./blog/post-types";
import { divingPosts } from "./blog/posts-diving";
import { tourPosts } from "./blog/posts-tours";
import { miscPosts } from "./blog/posts-misc";

/** Stable order: core diving guides → tours & travel → lifestyle & adventure */
export const blogPosts: BlogPost[] = [
  ...divingPosts,
  ...tourPosts,
  ...miscPosts,
];

/** Pillar URLs for homepage preview and blog index ordering (Goa scuba SEO cluster) */
export const SEO_PILLAR_SLUGS = [
  "best-time-for-scuba-diving-in-goa",
  "is-scuba-diving-safe",
  "scuba-diving-price-guide-2026",
] as const;

export function blogPostsPillarFirst(): BlogPost[] {
  const set = new Set<string>(SEO_PILLAR_SLUGS);
  const first = SEO_PILLAR_SLUGS.map((slug) => blogPosts.find((p) => p.slug === slug)).filter(
    (p): p is BlogPost => p != null
  );
  const rest = blogPosts.filter((p) => !set.has(p.slug));
  return [...first, ...rest];
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}
