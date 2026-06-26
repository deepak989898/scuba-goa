import { SITE_NAME, SITE_URL } from "@/lib/constants";
import { buildBlogCatalogContext } from "@/lib/blog-automation/catalog-context";
import { downloadCompressUploadBlogImage } from "@/lib/blog-automation/images";
import { searchPexelsPhotoForPost } from "@/lib/blog-automation/pexels";
import { blogSlugExists } from "@/lib/blog-posts-server";
import { getPostBySlug } from "@/data/blog-posts";
import {
  isValidBlogSlug,
  normalizeBlogSlugInput,
  type BlogPostFirestore,
} from "@/lib/blog-firestore";
import { getServiceBySlugServer } from "@/lib/get-services-server";
import { generateBlogWithOpenAI } from "@/lib/blog-automation/openai";
import type { SeoBlogDraft, SeoBlogKeyword, SeoBlogMeta } from "@/lib/seo-blog-center/types";
import { generateImageAltText, generateSeoMetaForKeyword } from "@/lib/seo-blog-center/seo-meta";
import { inferServiceSlug } from "@/lib/seo-blog-center/utils";

function estimateReadTime(content: string): string {
  const words = content.split(/\s+/).filter(Boolean).length;
  const mins = Math.max(4, Math.min(14, Math.ceil(words / 200)));
  return `${mins} min read`;
}

async function ensureUniqueSlug(base: string): Promise<string> {
  let slug = normalizeBlogSlugInput(base);
  if (!isValidBlogSlug(slug)) slug = `goa-scuba-${Date.now()}`;
  let attempt = slug;
  let n = 0;
  while (getPostBySlug(attempt) || (await blogSlugExists(attempt))) {
    n += 1;
    attempt = `${slug}-${n}`;
  }
  return attempt;
}

function injectInternalLinks(content: string, serviceSlug: string): string {
  let out = content;
  if (!out.includes("/booking")) {
    out += `\n\n[Reserve your dive slot](/booking) with a small online deposit.`;
  }
  if (!out.includes(`/services/${serviceSlug}`)) {
    out += `\n\nBrowse [${serviceSlug.replace(/-/g, " ")} packages](/services/${serviceSlug}) for live prices.`;
  }
  if (!out.includes("/services")) {
    out += `\n\nSee all [Goa adventure services](/services) including scuba, island trips, and water sports.`;
  }
  if (!out.includes("/blog")) {
    out += `\n\nRead more on our [Goa scuba & travel blog](/blog).`;
  }
  return out;
}

export async function generateSeoBlogDraft(input: {
  keyword: SeoBlogKeyword;
  seoMeta?: SeoBlogMeta | null;
}): Promise<SeoBlogDraft> {
  const meta = input.seoMeta ?? (await generateSeoMetaForKeyword(input.keyword));
  const serviceSlug = meta.serviceSlug || inferServiceSlug(input.keyword.keyword);
  const service = await getServiceBySlugServer(serviceSlug);
  const serviceName = service?.title ?? "Scuba Diving";
  const catalog = await buildBlogCatalogContext();

  const draft = await generateBlogWithOpenAI({
    title: input.keyword.keyword,
    serviceName,
    serviceSlug,
    language: "en",
    preferredSlug: meta.slug,
    catalogContext: catalog.textBlock,
  });

  const slug = await ensureUniqueSlug(draft.slug || meta.slug);
  let content = injectInternalLinks(draft.content, serviceSlug);

  if (!/##\s*prices/i.test(content)) {
    const { buildOfficialPricingMarkdown } = await import(
      "@/lib/blog-automation/catalog-context"
    );
    content += buildOfficialPricingMarkdown(catalog, serviceSlug);
  }

  const pexels = await searchPexelsPhotoForPost({
    title: draft.title,
    serviceSlug,
    serviceName,
  });
  let featuredImageUrl = "";
  let ogImageUrl = "";
  if (pexels) {
    try {
      const uploaded = await downloadCompressUploadBlogImage({
        imageUrl: pexels.url,
        slug,
      });
      featuredImageUrl = uploaded.featuredImageUrl;
      ogImageUrl = uploaded.ogImageUrl;
    } catch {
      /* optional image */
    }
  }

  const featuredImageAlt =
    pexels?.alt?.trim() ||
    generateImageAltText(input.keyword.keyword, draft.title);

  const now = new Date().toISOString();
  const schemaMarkup = {
    ...meta.schemaMarkup,
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: draft.title,
    description: draft.metaDescription,
    image: featuredImageUrl || undefined,
    datePublished: now,
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/book-scuba-goa-logo.png` },
    },
    mainEntityOfPage: `${SITE_URL.replace(/\/$/, "")}/blog/${slug}`,
  };

  return {
    id: `sbc_${slug}_${Date.now()}`,
    keywordId: input.keyword.id,
    keyword: input.keyword.keyword,
    slug,
    title: draft.title,
    excerpt: draft.excerpt,
    metaTitle: draft.metaTitle || meta.seoTitle,
    metaDescription: draft.metaDescription || meta.seoDescription,
    keywords: draft.keywords.length ? draft.keywords : meta.metaKeywords,
    content,
    faqs: draft.faqs.length ? draft.faqs : meta.faq,
    readTime: draft.readTime || estimateReadTime(content),
    featuredImageUrl,
    featuredImageAlt,
    ogImageUrl,
    schemaMarkup,
    serviceSlug,
    language: "en",
    status: "draft",
    source: "seo-blog-center",
    createdAt: now,
  };
}

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
  };
}
