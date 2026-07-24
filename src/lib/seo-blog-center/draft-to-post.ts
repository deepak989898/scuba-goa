import type { BlogPostFirestore } from "@/lib/blog-firestore";
import type { SeoBlogDraft } from "@/lib/seo-blog-center/types";

/** Convert an SEO center draft into a BlogPostFirestore shape for admin edit / publish. */
export function seoBlogDraftToFirestorePost(
  draft: SeoBlogDraft,
  published: boolean,
): BlogPostFirestore {
  const now = new Date().toISOString();
  return {
    slug: draft.slug,
    title: draft.title,
    excerpt: draft.excerpt,
    metaTitle: draft.metaTitle,
    metaDescription: draft.metaDescription,
    keywords: draft.keywords,
    content: draft.content,
    faqs: draft.faqs,
    date: now.slice(0, 10),
    updatedAt: now,
    readTime: draft.readTime,
    featuredImageUrl: draft.featuredImageUrl,
    featuredImageAlt: draft.featuredImageAlt,
    ogImageUrl: draft.ogImageUrl || draft.featuredImageUrl,
    schemaMarkup: draft.schemaMarkup,
    language: draft.language,
    published,
    source: "auto",
    serviceSlug: draft.serviceSlug,
    pillar: false,
    createdAt: draft.createdAt,
    publishedAt: published ? now : undefined,
    imageMeta: draft.imageMeta,
  };
}
