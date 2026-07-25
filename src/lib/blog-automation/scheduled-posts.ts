import {
  blogPostToFirestorePayload,
  parseBlogPostFromFirestore,
  type BlogLanguage,
  type BlogPostFirestore,
} from "@/lib/blog-firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { syncBlogImageToHomeGallery } from "@/lib/home-gallery-sync";
import { postBlogToGoogleBusinessProfile } from "@/lib/google-business/sync-blog-post";
import type { BlogAutomationSettings } from "@/lib/blog-automation/settings";
import {
  getEffectiveDayPlanForDate,
  listIstDatesFromToday,
} from "@/lib/blog-automation/daily-schedule";
import { getIstNow } from "@/lib/blog-automation/schedule-utils";
import { istSlotToUtcIso } from "@/lib/blog-automation/schedule-ist";
import { markSlotCompleted } from "@/lib/blog-automation/schedule";

export type GenerateScheduledResult =
  | { ok: true; slug: string; title: string; scheduledPublishAt: string }
  | { ok: false; error: string };

/** Post already tied to this IST calendar day + slot. */
export async function getPostForScheduleSlot(
  scheduleDateIst: string,
  publishSlotIst: string,
): Promise<BlogPostFirestore | null> {
  const db = getAdminDb();
  if (!db) return null;
  const snap = await db
    .collection("blogPosts")
    .where("scheduleDateIst", "==", scheduleDateIst)
    .where("publishSlotIst", "==", publishSlotIst)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0]!;
  return parseBlogPostFromFirestore(doc.id, doc.data() as Record<string, unknown>, {
    requirePublished: false,
  });
}

export async function countPostsForScheduleDateIst(dateIst: string): Promise<number> {
  const db = getAdminDb();
  if (!db) return 0;
  const snap = await db
    .collection("blogPosts")
    .where("scheduleDateIst", "==", dateIst)
    .get();
  return snap.size;
}

/** Publish a scheduled/draft post (gallery + Google Business when enabled). */
export async function publishBlogPostNow(
  slug: string,
  options?: { skipGallery?: boolean; skipGbp?: boolean },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = getAdminDb();
  if (!db) return { ok: false, error: "Firebase Admin not configured" };

  const ref = db.collection("blogPosts").doc(slug);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, error: "Post not found" };

  const post = parseBlogPostFromFirestore(slug, snap.data() as Record<string, unknown>, {
    requirePublished: false,
  });
  if (!post) return { ok: false, error: "Invalid post data" };
  if (post.published) return { ok: true };

  const now = new Date().toISOString();
  const istDate = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  await ref.set(
    blogPostToFirestorePayload({
      ...post,
      published: true,
      publishedAt: now,
      date: istDate,
      updatedAt: now,
    }),
    { merge: true },
  );

  if (post.publishSlotIst && post.scheduleDateIst) {
    await markSlotCompleted(post.scheduleDateIst, post.publishSlotIst);
  }

  if (!options?.skipGallery && post.featuredImageUrl) {
    try {
      await syncBlogImageToHomeGallery({
        blogSlug: slug,
        title: post.title,
        featuredImageUrl: post.featuredImageUrl,
        serviceSlug: post.serviceSlug,
        published: true,
      });
    } catch (e) {
      console.error("[blog] gallery sync on publish:", e);
    }
  }

  if (!options?.skipGbp) {
    try {
      await postBlogToGoogleBusinessProfile({
        slug,
        title: post.title,
        excerpt: post.excerpt,
        featuredImageUrl: post.featuredImageUrl || undefined,
        language: post.language,
      });
    } catch (e) {
      console.error("[blog] GBP on publish:", e);
    }
  }

  // GSC Indexing Agent — inventory + audit + delayed URL Inspection (no Indexing API)
  try {
    const { onPublicUrlPublished } = await import("@/lib/gsc-indexing-agent");
    await onPublicUrlPublished({
      path: `/blog/${slug}`,
      pageType: "blog",
      contentId: slug,
      publishedAt: now,
      locale: post.language || "en",
    });
  } catch (e) {
    console.error("[blog] GSC indexing agent publish hook:", e);
  }

  return { ok: true };
}

/** Posts whose scheduled time has passed — publish up to `limit`. */
export async function publishDueScheduledPosts(limit = 5): Promise<{
  published: string[];
  errors: string[];
}> {
  const db = getAdminDb();
  if (!db) return { published: [], errors: ["Firebase Admin not configured"] };

  const nowMs = Date.now();
  const snap = await db.collection("blogPosts").where("published", "==", false).get();

  const due: { slug: string; at: number }[] = [];
  for (const doc of snap.docs) {
    const post = parseBlogPostFromFirestore(doc.id, doc.data() as Record<string, unknown>, {
      requirePublished: false,
    });
    if (!post?.scheduledPublishAt) continue;
    const at = new Date(post.scheduledPublishAt).getTime();
    if (!Number.isNaN(at) && at <= nowMs) {
      due.push({ slug: post.slug, at });
    }
  }

  due.sort((a, b) => a.at - b.at);
  const published: string[] = [];
  const errors: string[] = [];

  for (const item of due.slice(0, limit)) {
    const result = await publishBlogPostNow(item.slug);
    if (result.ok) published.push(item.slug);
    else errors.push(`${item.slug}: ${result.error}`);
  }

  return { published, errors };
}

/**
 * Generate content for a slot, save as scheduled (not live).
 * Reuses generate pipeline but overrides publish flags.
 */
export async function generateScheduledBlogForSlot(input: {
  publishSlotIst: string;
  scheduleDateIst: string;
  language?: BlogLanguage;
  forceTitle?: string;
  forceServiceSlug?: string;
  queueItemId?: string;
}): Promise<GenerateScheduledResult> {
  const existing = await getPostForScheduleSlot(
    input.scheduleDateIst,
    input.publishSlotIst,
  );
  if (existing) {
    return {
      ok: false,
      error: `Slot ${input.publishSlotIst} on ${input.scheduleDateIst} already has a post (${existing.slug})`,
    };
  }

  let scheduledPublishAt: string;
  try {
    scheduledPublishAt = istSlotToUtcIso(input.scheduleDateIst, input.publishSlotIst);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Invalid schedule time",
    };
  }

  const db = getAdminDb();
  if (!db) return { ok: false, error: "Firebase Admin not configured" };

  const { generateBlogDraftOnly } = await import(
    "@/lib/blog-automation/generate-blog-draft"
  );
  const draft = await generateBlogDraftOnly({
    language: input.language,
    forceTitle: input.forceTitle,
    forceServiceSlug: input.forceServiceSlug,
    queueItemId: input.queueItemId,
  });

  if (!draft.ok) return { ok: false, error: draft.error };

  const now = new Date().toISOString();
  const payload = blogPostToFirestorePayload({
    ...draft.post,
    published: false,
    publishedAt: undefined,
    scheduleDateIst: input.scheduleDateIst,
    publishSlotIst: input.publishSlotIst,
    scheduledPublishAt,
    date: input.scheduleDateIst,
    createdAt: now,
    updatedAt: now,
  });

  await db.collection("blogPosts").doc(draft.post.slug).set(payload, { merge: false });

  if (draft.queueId) {
    const { markTopicUsed } = await import("@/lib/blog-automation/topics");
    await markTopicUsed(draft.queueId);
  }

  const { getBlogAutomationSettings, saveBlogAutomationSettings } = await import(
    "@/lib/blog-automation/settings"
  );
  const autoSettings = await getBlogAutomationSettings();
  await saveBlogAutomationSettings({
    autoTopicIndex: autoSettings.autoTopicIndex + 1,
    lastRunStatus: `scheduled:${draft.post.slug}@${input.publishSlotIst}`,
  });

  return {
    ok: true,
    slug: draft.post.slug,
    title: draft.post.title,
    scheduledPublishAt,
  };
}

/** Create scheduled posts for every slot on a date that does not have one yet. */
export async function prepareScheduledPostsForDate(
  scheduleDateIst: string,
  settings: BlogAutomationSettings,
): Promise<{ prepared: string[]; skipped: string[]; errors: string[] }> {
  const plan = await getEffectiveDayPlanForDate(scheduleDateIst, settings);
  const prepared: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  let count = await countPostsForScheduleDateIst(scheduleDateIst);

  for (const slot of plan.publishSlotsIst) {
    if (count >= plan.postsPerDay) {
      skipped.push(`daily limit (${plan.postsPerDay})`);
      break;
    }

    const existing = await getPostForScheduleSlot(scheduleDateIst, slot);
    if (existing) {
      skipped.push(`${slot}: already exists (${existing.slug})`);
      continue;
    }

    try {
      const result = await generateScheduledBlogForSlot({
        publishSlotIst: slot,
        scheduleDateIst,
      });
      if (result.ok) {
        prepared.push(`${result.slug}@${slot}`);
        count += 1;
      } else {
        errors.push(result.error);
      }
    } catch (e) {
      errors.push(e instanceof Error ? e.message : "Prepare failed");
    }
  }

  return { prepared, skipped, errors };
}

export async function prepareTodaysScheduledPosts(
  settings: BlogAutomationSettings,
): Promise<{ prepared: string[]; skipped: string[]; errors: string[] }> {
  const now = getIstNow();
  return prepareScheduledPostsForDate(now.date, settings);
}

const MAX_PREPARE_PER_REQUEST = 25;

/** Prepare missing scheduled drafts across consecutive IST days (stops after max posts). */
export async function prepareScheduledPostsBulk(
  settings: BlogAutomationSettings,
  options: { startOffsetDays?: number; numDays?: number } = {},
): Promise<{
  prepared: string[];
  skipped: string[];
  errors: string[];
  daysTouched: string[];
}> {
  const start = Math.max(0, options.startOffsetDays ?? 0);
  const numDays = Math.min(30, Math.max(1, options.numDays ?? 7));
  const allPrepared: string[] = [];
  const allSkipped: string[] = [];
  const allErrors: string[] = [];
  const daysTouched: string[] = [];
  let budget = MAX_PREPARE_PER_REQUEST;

  const dateList = listIstDatesFromToday(start + numDays).slice(start, start + numDays);

  for (const dateIst of dateList) {
    if (budget <= 0) break;
    daysTouched.push(dateIst);
    const r = await prepareScheduledPostsForDate(dateIst, settings);
    allPrepared.push(...r.prepared);
    allSkipped.push(...r.skipped.map((s) => `${dateIst}: ${s}`));
    allErrors.push(...r.errors.map((e) => `${dateIst}: ${e}`));
    budget -= r.prepared.length;
    if (r.prepared.length === 0 && r.errors.length > 0) break;
  }

  return {
    prepared: allPrepared,
    skipped: allSkipped,
    errors: allErrors,
    daysTouched,
  };
}
