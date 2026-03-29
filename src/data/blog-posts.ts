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

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}
