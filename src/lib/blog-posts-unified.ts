import type { BlogPost } from "@/data/blog/post-types";
import {
  classifyContent,
  scoreClusterRelevance,
  type ClusterContentItem,
} from "@/lib/content-clusters";
import { hasEditorialBlogFeaturedImage } from "@/lib/cms-image";
import {
  blogFirestoreToBlogPost,
  getPublishedBlogPostBySlug,
  listPublishedBlogPostsServer,
} from "@/lib/blog-posts-server";

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

function toClusterItem(post: BlogPost): ClusterContentItem {
  return {
    kind: "blog",
    slug: post.slug,
    title: post.title,
    description: post.excerpt,
    keywords: post.keywords,
    imageUrl: post.imageUrl,
    updatedAt: post.updatedAt ?? post.date,
    href: `/blog/${post.slug}`,
    topic: classifyContent({
      title: post.title,
      keywords: post.keywords,
      slug: post.slug,
    }),
  };
}

export async function getRelatedBlogPostsMerged(
  currentSlug: string,
  limit = 6,
): Promise<BlogPost[]> {
  const allFs = await listPublishedBlogPostsServer();
  const current = allFs.find((p) => p.slug === currentSlug);
  if (!current) return [];

  const currentPost = blogFirestoreToBlogPost(current);
  const currentMeta = {
    kind: "blog" as const,
    slug: currentSlug,
    title: currentPost.title,
    description: currentPost.excerpt,
    keywords: currentPost.keywords,
    topic: classifyContent({
      title: currentPost.title,
      keywords: currentPost.keywords,
      slug: currentSlug,
    }),
  };

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
    .map((p) => {
      const post = blogFirestoreToBlogPost(p);
      const item = toClusterItem(post);
      return {
        post,
        score: scoreClusterRelevance(currentMeta, item),
      };
    })
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
