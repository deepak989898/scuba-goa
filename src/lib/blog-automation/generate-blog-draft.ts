import {
  isValidBlogSlug,
  normalizeBlogSlugInput,
  type BlogLanguage,
  type BlogPostFirestore,
} from "@/lib/blog-firestore";
import { blogSlugExists } from "@/lib/blog-posts-server";
import { getPostBySlug } from "@/data/blog-posts";
import { getAllServicesServer, getServiceBySlugServer } from "@/lib/get-services-server";
import {
  buildBlogCatalogContext,
  buildOfficialPricingMarkdown,
} from "@/lib/blog-automation/catalog-context";
import { generateBlogWithOpenAI } from "@/lib/blog-automation/openai";
import { generateBlogImageBufferFromTitle } from "@/lib/blog-automation/openai-image";
import { searchPexelsPhotoForPost } from "@/lib/blog-automation/pexels";
import {
  brandAndUploadBlogImageBuffer,
  downloadCompressUploadBlogImage,
} from "@/lib/blog-automation/images";
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
        ogImageUrl: string;
        language: BlogLanguage;
        serviceSlug: string;
        source: "auto";
        pillar: false;
        createdAt: string;
      };
      queueId?: string;
    }
  | { ok: false; error: string };

async function ensureUniqueSlug(base: string): Promise<string> {
  let slug = normalizeBlogSlugInput(base);
  if (!isValidBlogSlug(slug)) slug = `goa-blog-${Date.now()}`;
  let attempt = slug;
  let n = 0;
  while (getPostBySlug(attempt) || (await blogSlugExists(attempt))) {
    n += 1;
    attempt = `${slug}-${n}`;
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

  // Prefer OpenAI image from title; fall back to Pexels stock photo.
  try {
    const aiBuf = await generateBlogImageBufferFromTitle(draft.title);
    const uploaded = await brandAndUploadBlogImageBuffer(aiBuf, slug);
    featuredImageUrl = uploaded.featuredImageUrl;
    ogImageUrl = uploaded.ogImageUrl;
  } catch (e) {
    console.warn(
      "[generate-blog-draft] OpenAI image failed, trying Pexels:",
      e instanceof Error ? e.message : e,
    );
    const photo = await searchPexelsPhotoForPost({
      title: draft.title,
      serviceSlug,
      serviceName,
    });
    if (photo?.url) {
      const uploaded = await downloadCompressUploadBlogImage({
        imageUrl: photo.url,
        slug,
      });
      featuredImageUrl = uploaded.featuredImageUrl;
      ogImageUrl = uploaded.ogImageUrl;
    }
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
      ogImageUrl,
      language: lang,
      source: "auto",
      serviceSlug,
      pillar: false,
      createdAt: now,
    },
    queueId,
  };
}
