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
import { searchPexelsPhotoForPost } from "@/lib/blog-automation/pexels";
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
import {
  getDueSlotNow,
  getIstNow,
  markSlotCompleted,
} from "@/lib/blog-automation/schedule";
import { getAdminDb } from "@/lib/firebase-admin";
import { syncBlogImageToHomeGallery } from "@/lib/home-gallery-sync";
import { postBlogToGoogleBusinessProfile } from "@/lib/google-business/sync-blog-post";

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
  const photo = await searchPexelsPhotoForPost({
    title: draft.title,
    serviceSlug,
    serviceName,
  });
  if (photo?.url) {
    try {
      const uploaded = await downloadCompressUploadBlogImage({
        imageUrl: photo.url,
        slug,
      });
      featuredImageUrl = uploaded.featuredImageUrl;
      ogImageUrl = uploaded.ogImageUrl;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Image upload failed";
      console.error("[blog-automation] blog image failed:", msg);
      throw new Error(`Could not save blog image (logo bar). ${msg}`);
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

  if (featuredImageUrl) {
    try {
      await syncBlogImageToHomeGallery({
        blogSlug: slug,
        title: draft.title,
        featuredImageUrl,
        serviceSlug,
        published: true,
      });
    } catch (e) {
      console.error("[blog-automation] gallery sync failed:", e);
    }
  }

  try {
    const gbp = await postBlogToGoogleBusinessProfile({
      slug,
      title: draft.title,
      excerpt: draft.excerpt,
      featuredImageUrl: featuredImageUrl || undefined,
      language: lang,
    });
    if (!gbp.ok) {
      console.error("[blog-automation] Google Business post failed:", gbp.error);
    } else if (gbp.posted) {
      console.info("[blog-automation] Google Business post created:", gbp.postName);
    }
  } catch (e) {
    console.error("[blog-automation] Google Business sync error:", e);
  }

  if (queueId) await markTopicUsed(queueId);

  await saveBlogAutomationSettings({
    autoTopicIndex: settings.autoTopicIndex + 1,
    lastRunAt: now,
    lastRunStatus: `published:${slug}`,
    lastRunError: null,
  });

  return { ok: true, slug, title: draft.title };
}

export type RunBlogCronOptions = {
  /** Admin “run daily job now” — publish all remaining quota, ignore schedule. */
  forceAllRemaining?: boolean;
};

export async function runBlogAutomationCron(
  options?: RunBlogCronOptions,
): Promise<{
  published: string[];
  skipped: string[];
  errors: string[];
  slot?: string;
}> {
  const settings = await getBlogAutomationSettings();
  const published: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];
  const now = getIstNow();

  if (!settings.enabled && !options?.forceAllRemaining) {
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

  let dueSlot: string | null = null;
  if (!options?.forceAllRemaining) {
    dueSlot = await getDueSlotNow(settings.publishSlotsIst);
    if (!dueSlot) {
      skipped.push(
        `no slot due now (IST ${String(now.hour).padStart(2, "0")}:${String(now.minute).padStart(2, "0")}; schedule: ${settings.publishSlotsIst.join(", ")})`,
      );
      return { published, skipped, errors };
    }
  }

  const publishCount = options?.forceAllRemaining ? remaining : 1;

  for (let i = 0; i < publishCount; i += 1) {
    try {
      const result = await generateAndPublishOneBlog();
      if (result.ok) {
        published.push(result.slug);
        if (dueSlot) {
          await markSlotCompleted(now.date, dueSlot);
        }
      } else {
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

  await saveBlogAutomationSettings({
    lastRunAt: new Date().toISOString(),
    lastRunStatus: published.length
      ? `published:${published.join(",")}${dueSlot ? `@${dueSlot}` : ""}`
      : "no-publish",
  });

  return { published, skipped, errors, slot: dueSlot ?? undefined };
}
