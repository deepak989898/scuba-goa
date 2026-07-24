import { blogPosts, SEO_PILLAR_SLUGS } from "@/data/blog-posts";
import type { BlogPost } from "@/data/blog/post-types";
import type { BlogPostFirestore } from "@/lib/blog-firestore";

export type StaticBlogListItem = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  pillar: boolean;
  keywords: string[];
  readTime: string;
  /** True when a Firestore blogPosts doc already exists for this slug (overrides code). */
  inFirestore: boolean;
};

export function listStaticCodeBlogs(
  firestoreSlugs: Set<string>,
): StaticBlogListItem[] {
  const pillarSet = new Set<string>(SEO_PILLAR_SLUGS);
  return blogPosts
    .map((p) => ({
      slug: p.slug,
      title: p.title,
      date: p.date,
      excerpt: p.excerpt,
      pillar: Boolean(p.pillar) || pillarSet.has(p.slug),
      keywords: p.keywords.slice(0, 8),
      readTime: p.readTime,
      inFirestore: firestoreSlugs.has(p.slug),
    }))
    .sort((a, b) => {
      if (a.pillar !== b.pillar) return a.pillar ? -1 : 1;
      return b.date.localeCompare(a.date) || a.title.localeCompare(b.title);
    });
}

export function getStaticCodeBlogBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}

/** Convert a code/static BlogPost into Firestore shape for admin edit. */
export function staticBlogToFirestorePost(
  post: BlogPost,
  opts?: { published?: boolean },
): BlogPostFirestore {
  const now = new Date().toISOString();
  const published = opts?.published !== false;
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    metaTitle: post.metaTitle?.trim() || `${post.title} | Book Scuba Goa`,
    metaDescription: post.excerpt.slice(0, 160),
    keywords: post.keywords,
    content: post.content,
    faqs: post.faqs ?? [],
    date: post.date,
    updatedAt: now,
    readTime: post.readTime,
    featuredImageUrl: post.imageUrl?.trim() || "",
    featuredImageAlt: post.imageAlt?.trim() || post.title,
    ogImageUrl: post.imageUrl?.trim() || "",
    language: "en",
    published,
    source: "manual",
    serviceSlug: "",
    pillar: Boolean(post.pillar),
    createdAt: `${post.date}T00:00:00.000Z`,
    publishedAt: published ? `${post.date}T00:00:00.000Z` : undefined,
  };
}
