import { getAdminDb } from "@/lib/firebase-admin";
import {
  isValidBlogSlug,
  normalizeBlogSlugInput,
  parseBlogPostFromFirestore,
  pickBlogDisplayUpdatedYmd,
  type BlogPostFirestore,
} from "@/lib/blog-firestore";
import type { BlogPost } from "@/data/blog/post-types";

export function blogFirestoreToBlogPost(p: BlogPostFirestore): BlogPost {
  return {
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    date: p.date,
    updatedAt: pickBlogDisplayUpdatedYmd(p),
    readTime: p.readTime,
    imageUrl: p.featuredImageUrl || p.ogImageUrl || undefined,
    imageAlt: p.featuredImageAlt || p.title,
    keywords: p.keywords,
    content: p.content,
    metaTitle: p.metaTitle,
    pillar: p.pillar,
    faqs: p.faqs.length ? p.faqs : undefined,
  };
}

export type BlogPostListItem = {
  slug: string;
  title: string;
  date: string;
  updatedAt: string;
  language: string;
  source: string;
};

export async function getPublishedBlogPostBySlug(
  slug: string,
): Promise<BlogPostFirestore | null> {
  const key = normalizeBlogSlugInput(slug);
  if (!isValidBlogSlug(key)) return null;
  const db = getAdminDb();
  if (!db) return null;
  try {
    const ref = await db.collection("blogPosts").doc(key).get();
    if (!ref.exists) return null;
    return parseBlogPostFromFirestore(ref.id, ref.data() as Record<string, unknown>, {
      requirePublished: true,
    });
  } catch {
    return null;
  }
}

export async function listPublishedBlogPostsServer(): Promise<BlogPostFirestore[]> {
  const db = getAdminDb();
  if (!db) return [];
  try {
    const snap = await db.collection("blogPosts").where("published", "==", true).get();
    const out: BlogPostFirestore[] = [];
    for (const d of snap.docs) {
      const p = parseBlogPostFromFirestore(d.id, d.data() as Record<string, unknown>, {
        requirePublished: true,
      });
      if (p) out.push(p);
    }
    out.sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt));
    return out;
  } catch {
    return [];
  }
}

export async function listPublishedBlogSlugsServer(): Promise<string[]> {
  const posts = await listPublishedBlogPostsServer();
  return posts.map((p) => p.slug);
}

export async function blogSlugExists(slug: string): Promise<boolean> {
  const key = normalizeBlogSlugInput(slug);
  if (!isValidBlogSlug(key)) return true;
  const db = getAdminDb();
  if (!db) return false;
  const ref = await db.collection("blogPosts").doc(key).get();
  return ref.exists;
}

/**
 * True when a slug should not be used for a new published post:
 * an already-published Firestore doc.
 * Unpublished drafts / redirect stubs do not block (avoids `-6` spam).
 */
export async function blogSlugBlocksNewPost(slug: string): Promise<boolean> {
  const key = normalizeBlogSlugInput(slug);
  if (!isValidBlogSlug(key)) return true;
  const published = await getPublishedBlogPostBySlug(key);
  return Boolean(published);
}
