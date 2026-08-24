import { SITE_NAME, SITE_URL } from "@/lib/constants";
import { buildBlogCatalogContext } from "@/lib/blog-automation/catalog-context";
import { generateFeaturedImageForArticle } from "@/lib/blog-automation/image-pipeline";
import { attachStockFeaturedImage } from "@/lib/blog-automation/stock-featured-image";
import { blogSlugBlocksNewPost } from "@/lib/blog-posts-server";
import { getPostBySlug } from "@/data/blog-posts";
import {
  isValidBlogSlug,
  normalizeBlogSlugInput,
} from "@/lib/blog-firestore";
import { getServiceBySlugServer } from "@/lib/get-services-server";
import { generateBlogWithOpenAI } from "@/lib/blog-automation/openai";
import type { SeoBlogDraft, SeoBlogKeyword, SeoBlogMeta } from "@/lib/seo-blog-center/types";
import { generateSeoMetaForKeyword } from "@/lib/seo-blog-center/seo-meta";
import { inferServiceSlug } from "@/lib/seo-blog-center/utils";
import { getSeoBlogSettings } from "@/lib/seo-blog-center/store";
import { seoBlogDraftToFirestorePost } from "@/lib/seo-blog-center/draft-to-post";

export { seoBlogDraftToFirestorePost } from "@/lib/seo-blog-center/draft-to-post";

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
  while (getPostBySlug(attempt) || (await blogSlugBlocksNewPost(attempt))) {
    n += 1;
    attempt = `${slug}-${n}`;
    if (n > 50) {
      attempt = `${slug}-${Date.now().toString(36)}`;
      break;
    }
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
  /** When false, skip OpenAI image and use free stock (Pexels → Pixabay → Unsplash) WebP. */
  generateAiImage?: boolean;
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

  let featuredImageUrl = "";
  let ogImageUrl = "";
  let featuredImageAlt = "";
  let imageMeta: SeoBlogDraft["imageMeta"] | undefined;

  const settings = await getSeoBlogSettings();
  const wantAiImage =
    input.generateAiImage !== false && settings.generateImages !== false;
  const articleId = `sbc_${slug}`;

  if (wantAiImage) {
    const img = await generateFeaturedImageForArticle({
      articleId,
      slug,
      title: draft.title,
      primaryKeyword: input.keyword.keyword,
      serviceSlug,
      serviceName,
      contentExcerpt: content.slice(0, 600),
      brandingEnabled: true,
      allowPexelsFallback: true,
      maxRetries: 3,
      minRelevanceScore: 90,
      minUniquenessScore: 85,
      minOverallScore: 88,
    });
    if (img.meta) {
      featuredImageUrl = img.meta.imageUrl;
      ogImageUrl = img.meta.ogImageUrl;
      featuredImageAlt = img.meta.imageAlt;
      imageMeta = {
        visualCategory: img.meta.visualCategory,
        compositionSignature: img.meta.compositionSignature,
        generatedPrompt: img.meta.generatedPrompt,
        generationModel: img.meta.generationModel,
        sha256: img.meta.sha256,
        perceptualHash: img.meta.perceptualHash,
        differenceHash: img.meta.differenceHash,
        promptHash: img.meta.promptHash,
        relevanceScore: img.meta.relevanceScore,
        uniquenessScore: img.meta.uniquenessScore,
        qualityScore: img.meta.qualityScore,
        safetyScore: img.meta.safetyScore,
        overallImageScore: img.meta.overallImageScore,
        validationNotes: img.meta.validationNotes,
        imageStatus: img.meta.imageStatus,
        imageTitle: img.meta.imageTitle,
        imageCaption: img.meta.imageCaption,
        width: img.meta.width,
        height: img.meta.height,
        mimeType: img.meta.mimeType,
        fileSize: img.meta.fileSize,
        source: img.meta.source,
        brandingApplied: img.meta.brandingApplied,
      };
    } else if (img.error) {
      console.warn("[seo-blog-center] Image pipeline failed:", img.error);
    }
  } else {
    // Free stock cascade: Pexels → Pixabay → Unsplash → WebP on Firebase
    const stock = await attachStockFeaturedImage({
      articleId,
      slug,
      title: draft.title,
      primaryKeyword: input.keyword.keyword,
      serviceSlug,
      serviceName,
      brandingEnabled: false,
    });
    if (stock.meta) {
      featuredImageUrl = stock.meta.imageUrl;
      ogImageUrl = stock.meta.ogImageUrl;
      featuredImageAlt = stock.meta.imageAlt;
      imageMeta = {
        visualCategory: stock.meta.visualCategory,
        compositionSignature: stock.meta.compositionSignature,
        generatedPrompt: stock.meta.generatedPrompt,
        generationModel: stock.meta.generationModel,
        sha256: stock.meta.sha256,
        perceptualHash: stock.meta.perceptualHash,
        differenceHash: stock.meta.differenceHash,
        promptHash: stock.meta.promptHash,
        relevanceScore: stock.meta.relevanceScore,
        uniquenessScore: stock.meta.uniquenessScore,
        qualityScore: stock.meta.qualityScore,
        safetyScore: stock.meta.safetyScore,
        overallImageScore: stock.meta.overallImageScore,
        validationNotes: stock.meta.validationNotes,
        imageStatus: stock.meta.imageStatus,
        imageTitle: stock.meta.imageTitle,
        imageCaption: stock.meta.imageCaption,
        width: stock.meta.width,
        height: stock.meta.height,
        mimeType: stock.meta.mimeType,
        fileSize: stock.meta.fileSize,
        source: stock.meta.source,
        brandingApplied: stock.meta.brandingApplied,
      };
    } else if (stock.error) {
      console.warn("[seo-blog-center] Stock image failed:", stock.error);
    }
  }

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
    imageMeta,
    createdAt: now,
  };
}
