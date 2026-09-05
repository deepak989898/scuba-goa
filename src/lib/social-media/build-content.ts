import { SITE_URL } from "@/lib/constants";
import type { BlogLanguage, BlogPostFirestore } from "@/lib/blog-firestore";
import type { SeoPageFirestore } from "@/lib/seo-page-firestore";
import type { SocialContentPayload } from "@/lib/social-media/types";

const site = SITE_URL.replace(/\/$/, "");

export function blogToSocialPayload(post: BlogPostFirestore): SocialContentPayload {
  return {
    contentType: "blog",
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt || post.metaDescription || "",
    url: `${site}/blog/${post.slug}`,
    imageUrl: post.featuredImageUrl || post.ogImageUrl || undefined,
    language: post.language as BlogLanguage,
  };
}

export function guideToSocialPayload(page: SeoPageFirestore): SocialContentPayload {
  const image =
    page.heroImageUrl?.trim() || page.ogImageUrl?.trim() || undefined;
  return {
    contentType: "guide",
    slug: page.slug,
    title: page.headline || page.metaTitle,
    excerpt: page.metaDescription || "",
    url: `${site}/guides/${page.slug}`,
    imageUrl: image?.startsWith("http")
      ? image
      : image
        ? `${site}${image.startsWith("/") ? image : `/${image}`}`
        : undefined,
  };
}

export function buildSocialCaption(payload: SocialContentPayload): string {
  const lines = [payload.title.trim()];
  const excerpt = payload.excerpt.trim().replace(/\s+/g, " ");
  if (excerpt) lines.push(excerpt.slice(0, 400));
  lines.push(payload.url);
  return lines.join("\n\n");
}
