import { blogPosts, getPostBySlug as getStaticPostBySlug } from "@/data/blog-posts";
import type { BlogPost } from "@/data/blog/post-types";
import {
  blogFirestoreToBlogPost,
  getPublishedBlogPostBySlug,
  listPublishedBlogPostsServer,
} from "@/lib/blog-posts-server";

/** Static posts + Firestore published posts (Firestore wins on slug collision). */
export async function getAllBlogPostsMerged(): Promise<BlogPost[]> {
  const fs = await listPublishedBlogPostsServer();
  const fsMap = new Map(fs.map((p) => [p.slug, blogFirestoreToBlogPost(p)]));
  const staticSlugs = new Set(blogPosts.map((p) => p.slug));
  const merged: BlogPost[] = [...blogPosts];
  for (const [slug, post] of fsMap) {
    if (!staticSlugs.has(slug)) merged.push(post);
  }
  merged.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
  return merged;
}

export async function getBlogPostBySlugMerged(
  slug: string,
): Promise<BlogPost | undefined> {
  const fs = await getPublishedBlogPostBySlug(slug);
  if (fs) return blogFirestoreToBlogPost(fs);
  return getStaticPostBySlug(slug);
}

export async function getAllBlogSlugsMerged(): Promise<string[]> {
  const merged = await getAllBlogPostsMerged();
  return merged.map((p) => p.slug);
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

export async function getRelatedBlogPostsMerged(
  currentSlug: string,
  limit = 3,
): Promise<BlogPost[]> {
  const all = await getAllBlogPostsMerged();
  const current = all.find((p) => p.slug === currentSlug);
  if (!current) return [];
  return all
    .filter((p) => p.slug !== currentSlug)
    .map((p) => ({ post: p, score: relatedScore(current, p) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.post.date.localeCompare(a.post.date))
    .slice(0, limit)
    .map((x) => x.post);
}
