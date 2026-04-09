import type { BlogPost } from "./blog/post-types";
export type { BlogPost, BlogFaq } from "./blog/post-types";
import { divingPosts } from "./blog/posts-diving";
import { tourPosts } from "./blog/posts-tours";
import { miscPosts } from "./blog/posts-misc";
import { intentPosts } from "./blog/posts-intent";

/** Stable order: core diving guides → tours & travel → lifestyle & adventure */
export const blogPosts: BlogPost[] = [
  ...divingPosts,
  ...intentPosts,
  ...tourPosts,
  ...miscPosts,
];

/** Pillar URLs for homepage preview and blog index ordering (Goa scuba SEO cluster) */
export const SEO_PILLAR_SLUGS = [
  "best-time-for-scuba-diving-in-goa",
  "is-scuba-diving-safe",
  "scuba-diving-with-island-trip-goa",
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

function normalizeToken(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .filter((x) => x.length >= 3);
}

function postKeywordSet(p: BlogPost): Set<string> {
  const set = new Set<string>();
  for (const kw of p.keywords) for (const t of normalizeToken(kw)) set.add(t);
  for (const t of normalizeToken(p.title)) set.add(t);
  return set;
}

function relatedScore(a: BlogPost, b: BlogPost): number {
  const as = postKeywordSet(a);
  const bs = postKeywordSet(b);
  let score = 0;
  for (const t of as) if (bs.has(t)) score += 1;
  return score;
}

/** Related links by keyword cluster overlap; excludes the current post. */
export function getRelatedBlogPosts(currentSlug: string, limit = 3): BlogPost[] {
  const current = getPostBySlug(currentSlug);
  if (!current) return [];
  return blogPosts
    .filter((p) => p.slug !== currentSlug)
    .map((p) => ({ post: p, score: relatedScore(current, p) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.post.date.localeCompare(a.post.date))
    .slice(0, limit)
    .map((x) => x.post);
}
