import type { BlogPost } from "@/data/blog/post-types";
import {
  blogFirestoreToBlogPost,
  getPublishedBlogPostBySlug,
  listPublishedBlogPostsServer,
} from "@/lib/blog-posts-server";
import { hasEditorialBlogFeaturedImage } from "@/lib/cms-image";

/** Published Firestore blogs (source of truth for the public site). */
export async function getAllBlogPostsMerged(): Promise<BlogPost[]> {
  const fs = await listPublishedBlogPostsServer();
  const merged = fs.map((p) => blogFirestoreToBlogPost(p));
  merged.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
  return merged;
}

export async function getBlogPostBySlugMerged(
  slug: string,
): Promise<BlogPost | undefined> {
  const fs = await getPublishedBlogPostBySlug(slug);
  if (fs) return blogFirestoreToBlogPost(fs);
  return undefined;
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
  limit = 6,
): Promise<BlogPost[]> {
  const allFs = await listPublishedBlogPostsServer();
  const current = allFs.find((p) => p.slug === currentSlug);
  if (!current) return [];

  const currentPost = blogFirestoreToBlogPost(current);
  const editorialFs = allFs.filter(
    (p) =>
      p.slug !== currentSlug &&
      hasEditorialBlogFeaturedImage(
        p.featuredImageUrl,
        p.ogImageUrl,
        p.imageMeta,
      ),
  );

  const scored = editorialFs
    .map((p) => ({
      post: blogFirestoreToBlogPost(p),
      score: relatedScore(currentPost, blogFirestoreToBlogPost(p)),
    }))
    .filter((x) => x.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || b.post.date.localeCompare(a.post.date),
    );

  const picked: BlogPost[] = [];
  const usedImages = new Set<string>();
  for (const row of scored) {
    if (picked.length >= limit) break;
    const img = row.post.imageUrl?.trim();
    if (img && usedImages.has(img) && scored.length > limit) continue;
    if (img) usedImages.add(img);
    picked.push(row.post);
  }

  if (picked.length < Math.min(3, limit)) {
    for (const row of scored) {
      if (picked.length >= limit) break;
      if (picked.some((p) => p.slug === row.post.slug)) continue;
      picked.push(row.post);
    }
  }
  return picked;
}
