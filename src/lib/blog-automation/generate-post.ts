import { blogPostToFirestorePayload } from "@/lib/blog-firestore";
import type { BlogLanguage } from "@/lib/blog-firestore";
import { markTopicUsed } from "@/lib/blog-automation/topics";
import {
  getBlogAutomationSettings,
  saveBlogAutomationSettings,
} from "@/lib/blog-automation/settings";
import { getDueSlotNow, getIstNow } from "@/lib/blog-automation/schedule";
import { generateBlogDraftOnly } from "@/lib/blog-automation/generate-blog-draft";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  prepareTodaysScheduledPosts,
  publishBlogPostNow,
  publishDueScheduledPosts,
} from "@/lib/blog-automation/scheduled-posts";

export type GenerateBlogResult =
  | { ok: true; slug: string; title: string }
  | { ok: false; error: string; skipped?: boolean };

export { generateBlogDraftOnly } from "@/lib/blog-automation/generate-blog-draft";

export async function generateAndPublishOneBlog(options?: {
  language?: BlogLanguage;
  forceTitle?: string;
  forceServiceSlug?: string;
  queueItemId?: string;
}): Promise<GenerateBlogResult> {
  const db = getAdminDb();
  if (!db) return { ok: false, error: "Firebase Admin not configured" };

  const settings = await getBlogAutomationSettings();

  try {
    const draft = await generateBlogDraftOnly(options);
    if (!draft.ok) return { ok: false, error: draft.error };

    const now = new Date().toISOString();
    const istDate = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });

    await db.collection("blogPosts").doc(draft.post.slug).set(
      blogPostToFirestorePayload({
        ...draft.post,
        published: false,
        date: istDate,
        updatedAt: now,
      }),
      { merge: false },
    );

    const pub = await publishBlogPostNow(draft.post.slug);
    if (!pub.ok) return { ok: false, error: pub.error };

    if (draft.queueId) await markTopicUsed(draft.queueId);

    await saveBlogAutomationSettings({
      autoTopicIndex: settings.autoTopicIndex + 1,
      lastRunAt: now,
      lastRunStatus: `published:${draft.post.slug}`,
      lastRunError: null,
    });

    return { ok: true, slug: draft.post.slug, title: draft.post.title };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Generation failed";
    return { ok: false, error: msg };
  }
}

export type RunBlogCronOptions = {
  forceAllRemaining?: boolean;
};

export async function runBlogAutomationCron(
  options?: RunBlogCronOptions,
): Promise<{
  published: string[];
  prepared: string[];
  skipped: string[];
  errors: string[];
  slot?: string;
}> {
  const settings = await getBlogAutomationSettings();
  const published: string[] = [];
  const prepared: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];
  const now = getIstNow();

  const due = await publishDueScheduledPosts(5);
  published.push(...due.published);
  errors.push(...due.errors);

  if (!settings.enabled && !options?.forceAllRemaining) {
    if (!published.length) skipped.push("automation disabled");
    return { published, prepared, skipped, errors };
  }

  if (options?.forceAllRemaining) {
    const prep = await prepareTodaysScheduledPosts(settings);
    prepared.push(...prep.prepared);
    skipped.push(...prep.skipped);
    errors.push(...prep.errors);

    const dueAgain = await publishDueScheduledPosts(10);
    published.push(...dueAgain.published);
    errors.push(...dueAgain.errors);

    await saveBlogAutomationSettings({
      lastRunAt: new Date().toISOString(),
      lastRunStatus: published.length
        ? `published:${published.join(",")}`
        : "force-run-done",
    });
    return { published, prepared, skipped, errors };
  }

  const prep = await prepareTodaysScheduledPosts(settings);
  prepared.push(...prep.prepared);
  skipped.push(...prep.skipped);
  errors.push(...prep.errors);

  const dueSlot = await getDueSlotNow(settings.publishSlotsIst);
  if (!dueSlot && !published.length && !prepared.length) {
    skipped.push(
      `waiting (IST ${String(now.hour).padStart(2, "0")}:${String(now.minute).padStart(2, "0")}; slots: ${settings.publishSlotsIst.join(", ")})`,
    );
  }

  await saveBlogAutomationSettings({
    lastRunAt: new Date().toISOString(),
    lastRunStatus: published.length
      ? `published:${published.join(",")}`
      : prepared.length
        ? `prepared:${prepared.join(",")}`
        : "cron-ok",
    lastRunError: errors.length ? errors.slice(0, 2).join("; ") : null,
  });

  return { published, prepared, skipped, errors, slot: dueSlot ?? undefined };
}
