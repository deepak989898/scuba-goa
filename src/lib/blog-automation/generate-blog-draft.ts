import {
  isValidBlogSlug,
  normalizeBlogSlugInput,
  type BlogLanguage,
  type BlogPostFirestore,
} from "@/lib/blog-firestore";
import { blogSlugBlocksNewPost } from "@/lib/blog-posts-server";
import { getPostBySlug } from "@/data/blog-posts";
import { getAllServicesServer, getServiceBySlugServer } from "@/lib/get-services-server";
import {
  buildBlogCatalogContext,
  buildOfficialPricingMarkdown,
} from "@/lib/blog-automation/catalog-context";
import { generateBlogWithOpenAI } from "@/lib/blog-automation/openai";
import { generateFeaturedImageForArticle } from "@/lib/blog-automation/image-pipeline";
import {
  buildAutoTopic,
  getNextPendingTopic,
} from "@/lib/blog-automation/topics";
import { getBlogAutomationSettings } from "@/lib/blog-automation/settings";

export type GenerateBlogDraftResult =
  | {
      ok: true;
      post: {
        slug: string;
        title: string;
        excerpt: string;
        metaTitle: string;
        metaDescription: string;
        keywords: string[];
        content: string;
        faqs: BlogPostFirestore["faqs"];
        date: string;
        readTime: string;
        featuredImageUrl: string;
        featuredImageAlt?: string;
        ogImageUrl: string;
        language: BlogLanguage;
        serviceSlug: string;
        source: "auto";
        pillar: false;
        createdAt: string;
        imageMeta?: BlogPostFirestore["imageMeta"];
      };
      queueId?: string;
    }
  | { ok: false; error: string };

async function ensureUniqueSlug(base: string): Promise<string> {
  let slug = normalizeBlogSlugInput(base);
  if (!isValidBlogSlug(slug)) slug = `goa-blog-${Date.now()}`;
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

function pickLanguage(
  settings: Awaited<ReturnType<typeof getBlogAutomationSettings>>,
  override?: BlogLanguage,
): BlogLanguage {
  if (override) return override;
  const rot = settings.languageRotation;
  if (rot.length === 0) return settings.defaultLanguage;
  const idx = settings.autoTopicIndex % rot.length;
  return rot[idx] ?? settings.defaultLanguage;
}

export async function generateBlogDraftOnly(options?: {
  language?: BlogLanguage;
  forceTitle?: string;
  forceServiceSlug?: string;
  queueItemId?: string;
}): Promise<GenerateBlogDraftResult> {
  const settings = await getBlogAutomationSettings();
  let lang = pickLanguage(settings, options?.language);

  let title = options?.forceTitle?.trim() ?? "";
  let serviceSlug = options?.forceServiceSlug?.trim() ?? "";
  let preferredSlug = "";
  let queueId = options?.queueItemId;

  if (!title) {
    const queued = await getNextPendingTopic();
    if (queued) {
      title = queued.title;
      serviceSlug = queued.serviceSlug || serviceSlug;
      preferredSlug = queued.slug;
      queueId = queued.id;
      if (!options?.language) lang = queued.language;
    }
  }

  if (!title) {
    const auto = await buildAutoTopic(settings.autoTopicIndex, lang);
    title = auto.title;
    serviceSlug = auto.serviceSlug;
  }

  const service =
    (serviceSlug ? await getServiceBySlugServer(serviceSlug) : null) ??
    (await getAllServicesServer())[0];
  const serviceName = service?.title ?? "Scuba diving";
  serviceSlug = service?.slug ?? serviceSlug ?? "scuba-diving";

  const catalog = await buildBlogCatalogContext();

  const draft = await generateBlogWithOpenAI({
    title,
    serviceName,
    serviceSlug,
    language: lang,
    preferredSlug: preferredSlug || undefined,
    catalogContext: catalog.textBlock,
  });

  let content = draft.content;
  if (!/##\s*prices/i.test(content)) {
    content += buildOfficialPricingMarkdown(catalog, serviceSlug);
  }

  const slug = await ensureUniqueSlug(
    preferredSlug || draft.slug || draft.title,
  );

  let featuredImageUrl = "";
  let ogImageUrl = "";
  let featuredImageAlt = "";
  let imageMeta: BlogPostFirestore["imageMeta"] | undefined;

  const img = await generateFeaturedImageForArticle({
    articleId: slug,
    slug,
    title: draft.title,
    primaryKeyword: draft.title,
    serviceSlug,
    serviceName,
    contentExcerpt: content.slice(0, 600),
    brandingEnabled: true,
    allowPexelsFallback: true,
    maxRetries: 3,
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
    console.warn("[generate-blog-draft] Image pipeline failed:", img.error);
  }

  const istDate = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
  const now = new Date().toISOString();

  return {
    ok: true,
    post: {
      slug,
      title: draft.title,
      excerpt: draft.excerpt,
      metaTitle: draft.metaTitle,
      metaDescription: draft.metaDescription,
      keywords: draft.keywords,
      content,
      faqs: draft.faqs,
      date: istDate,
      readTime: draft.readTime,
      featuredImageUrl,
      featuredImageAlt,
      ogImageUrl,
      language: lang,
      source: "auto",
      serviceSlug,
      pillar: false,
      createdAt: now,
      imageMeta,
    },
    queueId,
  };
}
