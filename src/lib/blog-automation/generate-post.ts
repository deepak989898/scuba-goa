import {
  blogPostToFirestorePayload,
  isValidBlogSlug,
  normalizeBlogSlugInput,
  type BlogLanguage,
} from "@/lib/blog-firestore";
import { blogSlugExists } from "@/lib/blog-posts-server";
import { getPostBySlug } from "@/data/blog-posts";
import { getAllServicesServer, getServiceBySlugServer } from "@/lib/get-services-server";
import { generateBlogWithOpenAI } from "@/lib/blog-automation/openai";
import { buildPexelsQuery, searchPexelsPhoto } from "@/lib/blog-automation/pexels";
import { downloadCompressUploadBlogImage } from "@/lib/blog-automation/images";
import {
  buildAutoTopic,
  getNextPendingTopic,
  markTopicUsed,
} from "@/lib/blog-automation/topics";
import {
  countBlogPostsPublishedTodayIst,
  getBlogAutomationSettings,
  saveBlogAutomationSettings,
} from "@/lib/blog-automation/settings";
import { getAdminDb } from "@/lib/firebase-admin";

export type GenerateBlogResult =
  | { ok: true; slug: string; title: string }
  | { ok: false; error: string; skipped?: boolean };

async function ensureUniqueSlug(base: string): Promise<string> {
  let slug = normalizeBlogSlugInput(base);
  if (!isValidBlogSlug(slug)) slug = `goa-blog-${Date.now()}`;
  let attempt = slug;
  let n = 0;
  while (
    getPostBySlug(attempt) ||
    (await blogSlugExists(attempt))
  ) {
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

export async function generateAndPublishOneBlog(options?: {
  language?: BlogLanguage;
  forceTitle?: string;
  forceServiceSlug?: string;
  queueItemId?: string;
}): Promise<GenerateBlogResult> {
  const db = getAdminDb();
  if (!db) return { ok: false, error: "Firebase Admin not configured" };

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

  const draft = await generateBlogWithOpenAI({
    title,
    serviceName,
    serviceSlug,
    language: lang,
    preferredSlug: preferredSlug || undefined,
  });

  const slug = await ensureUniqueSlug(
    preferredSlug || draft.slug || draft.title,
  );

  let featuredImageUrl = "";
  let ogImageUrl = "";
  const pexelsQuery = buildPexelsQuery(serviceName, draft.title);
  const photo = await searchPexelsPhoto(pexelsQuery);
  if (photo?.url) {
    try {
      const uploaded = await downloadCompressUploadBlogImage({
        imageUrl: photo.url,
        slug,
      });
      featuredImageUrl = uploaded.featuredImageUrl;
      ogImageUrl = uploaded.ogImageUrl;
    } catch {
      featuredImageUrl = photo.url;
      ogImageUrl = photo.url;
    }
  }

  const istDate = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
  const now = new Date().toISOString();

  const payload = blogPostToFirestorePayload({
    slug,
    title: draft.title,
    excerpt: draft.excerpt,
    metaTitle: draft.metaTitle,
    metaDescription: draft.metaDescription,
    keywords: draft.keywords,
    content: draft.content,
    faqs: draft.faqs,
    date: istDate,
    readTime: draft.readTime,
    featuredImageUrl,
    ogImageUrl,
    language: lang,
    published: true,
    source: "auto",
    serviceSlug,
    pillar: false,
    createdAt: now,
    publishedAt: now,
  });

  await db.collection("blogPosts").doc(slug).set(payload, { merge: false });

  if (queueId) await markTopicUsed(queueId);

  await saveBlogAutomationSettings({
    autoTopicIndex: settings.autoTopicIndex + 1,
    lastRunAt: now,
    lastRunStatus: `published:${slug}`,
    lastRunError: null,
  });

  return { ok: true, slug, title: draft.title };
}

export async function runBlogAutomationCron(): Promise<{
  published: string[];
  skipped: string[];
  errors: string[];
}> {
  const settings = await getBlogAutomationSettings();
  const published: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  if (!settings.enabled) {
    skipped.push("automation disabled");
    return { published, skipped, errors };
  }

  const todayCount = await countBlogPostsPublishedTodayIst();
  const remaining = Math.max(0, settings.postsPerDay - todayCount);
  if (remaining === 0) {
    skipped.push("daily quota reached");
    await saveBlogAutomationSettings({
      lastRunAt: new Date().toISOString(),
      lastRunStatus: "skipped:quota",
    });
    return { published, skipped, errors };
  }

  for (let i = 0; i < remaining; i += 1) {
    try {
      const result = await generateAndPublishOneBlog();
      if (result.ok) published.push(result.slug);
      else {
        errors.push(result.error);
        if (result.skipped) skipped.push(result.error);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      errors.push(msg);
      await saveBlogAutomationSettings({
        lastRunAt: new Date().toISOString(),
        lastRunStatus: "error",
        lastRunError: msg,
      });
    }
  }

  return { published, skipped, errors };
}
