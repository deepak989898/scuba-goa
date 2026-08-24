import { getAdminDb } from "@/lib/firebase-admin";
import { stripUndefinedDeep } from "@/lib/firestore-json";
import {
  generateSeoBlogDraft,
  seoBlogDraftToFirestorePost,
} from "@/lib/seo-blog-center/blog-writer";
import { generateSeoMetaForKeyword } from "@/lib/seo-blog-center/seo-meta";
import { validateDraftQuality } from "@/lib/seo-blog-center/quality-gate";
import {
  addSeoBlogLog,
  bumpDailyCounter,
  getClusterById,
  getGenerationJobById,
  getSeoBlogSettings,
  listGenerationJobs,
  saveDraft,
  saveGenerationJob,
  saveMeta,
  SEO_BLOG_COLLECTIONS,
} from "@/lib/seo-blog-center/store";
import {
  PROMPT_VERSION,
  type AiBlogGenerationJob,
  type GenerationJobStatus,
} from "@/lib/seo-blog-center/types";
import { blogPostToFirestorePayload } from "@/lib/blog-firestore";
import { revalidatePath } from "next/cache";

const LEASE_MS = 4 * 60 * 1000;

const GENERATING_STATUSES: GenerationJobStatus[] = [
  "generating-outline",
  "generating-content",
  "generating-image",
  "validating",
];

function workerId(): string {
  return `worker_${process.env.VERCEL_REGION || "local"}_${Math.random().toString(36).slice(2, 8)}`;
}

function todayIst(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function isGeneratingStatus(status: GenerationJobStatus): boolean {
  return GENERATING_STATUSES.includes(status);
}

/** Job stuck in a generating step (expired lease or missing lease). */
export function isStuckGeneratingJob(
  job: AiBlogGenerationJob,
  nowMs = Date.now(),
): boolean {
  if (!isGeneratingStatus(job.status)) return false;
  if (!job.leaseExpiresAt) return true;
  return new Date(job.leaseExpiresAt).getTime() < nowMs;
}

/**
 * Reset jobs left in generating-* after a timeout/crash back to waiting.
 */
export async function reconcileStuckGenerationJobs(): Promise<number> {
  const now = Date.now();
  const jobs = await listGenerationJobs(undefined, 150);
  let reset = 0;
  for (const job of jobs) {
    if (!isStuckGeneratingJob(job, now)) continue;
    await saveGenerationJob({
      ...job,
      status: "waiting",
      lockedBy: null,
      lockedAt: null,
      leaseExpiresAt: null,
      errorMessage:
        job.errorMessage ||
        "Reset from stuck generating state — will retry",
    });
    reset += 1;
  }
  if (reset > 0) {
    await addSeoBlogLog({
      type: "pipeline_run",
      message: `Reconciled ${reset} stuck generation job(s) back to waiting`,
    });
  }
  return reset;
}

async function tryClaimGenerationJob(
  jobId: string,
  worker: string,
): Promise<AiBlogGenerationJob | null> {
  const db = getAdminDb();
  if (!db) return null;
  const ref = db.collection(SEO_BLOG_COLLECTIONS.jobs).doc(jobId);

  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("missing");
      const data = { ...snap.data(), id: snap.id } as AiBlogGenerationJob;
      const leaseOk =
        !data.leaseExpiresAt ||
        new Date(data.leaseExpiresAt).getTime() < Date.now();
      if (
        data.status !== "waiting" &&
        !(leaseOk && isGeneratingStatus(data.status))
      ) {
        throw new Error("busy");
      }
      const locked: Partial<AiBlogGenerationJob> = {
        status: "generating-content",
        lockedBy: worker,
        lockedAt: new Date().toISOString(),
        leaseExpiresAt: new Date(Date.now() + LEASE_MS).toISOString(),
        startedAt: data.startedAt || new Date().toISOString(),
        attempts: (data.attempts || 0) + 1,
      };
      tx.set(ref, stripUndefinedDeep(locked), { merge: true });
    });
    return getGenerationJobById(jobId);
  } catch {
    return null;
  }
}

/**
 * Claim next waiting job with Firestore transaction lease.
 */
export async function claimNextGenerationJob(opts?: {
  skipPauseCheck?: boolean;
}): Promise<AiBlogGenerationJob | null> {
  const db = getAdminDb();
  if (!db) return null;
  const settings = await getSeoBlogSettings();
  if (!opts?.skipPauseCheck && settings.pauseGenerationQueue === true) {
    return null;
  }

  const now = Date.now();
  const allRecent = await listGenerationJobs(undefined, 150);
  const stale = allRecent.filter((j) => isStuckGeneratingJob(j, now));
  const waiting = allRecent
    .filter((j) => j.status === "waiting")
    .sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));

  const candidates = [...stale, ...waiting];
  if (candidates.length === 0) return null;

  const worker = workerId();
  for (const target of candidates) {
    const claimed = await tryClaimGenerationJob(target.id, worker);
    if (claimed) return claimed;
  }
  return null;
}

export async function processGenerationJob(
  job: AiBlogGenerationJob,
): Promise<{ ok: boolean; error?: string }> {
  const settings = await getSeoBlogSettings();
  const day = todayIst();
  if (
    settings.blogsGeneratedDate === day &&
    (settings.blogsGeneratedToday ?? 0) >= settings.maxBlogsGeneratedPerDay
  ) {
    await saveGenerationJob({
      ...job,
      status: "waiting",
      lockedBy: null,
      lockedAt: null,
      leaseExpiresAt: null,
      errorMessage: "Daily generation cap reached — will retry tomorrow",
    });
    return { ok: false, error: "daily_cap" };
  }

  try {
    const cluster = await getClusterById(job.clusterId);
    const keyword = {
      id: cluster?.primaryKeywordId || `kw_${job.id}`,
      keyword: job.primaryKeyword,
      searchVolume: 0,
      competition: "medium" as const,
      trendScore: 50,
      category: "scuba_diving" as const,
      seoScore: job.priority,
      status: "approved" as const,
      source: "ai" as const,
      createdAt: job.createdAt,
    };

    await saveGenerationJob({
      ...job,
      status: "generating-content",
      leaseExpiresAt: new Date(Date.now() + LEASE_MS).toISOString(),
    });

    const meta = await generateSeoMetaForKeyword(keyword);
    await saveMeta(meta);

    await saveGenerationJob({
      ...job,
      status: "generating-image",
      leaseExpiresAt: new Date(Date.now() + LEASE_MS).toISOString(),
    });

    const useAiImage =
      job.generateAiImage !== false && settings.generateImages !== false;

    const draft = await generateSeoBlogDraft({
      keyword,
      seoMeta: meta,
      generateAiImage: useAiImage,
    });
    draft.clusterId = job.clusterId;
    draft.jobId = job.id;
    draft.status = "pending_approval";

    await saveGenerationJob({
      ...job,
      status: "validating",
      leaseExpiresAt: new Date(Date.now() + LEASE_MS).toISOString(),
    });

    const quality = await validateDraftQuality(draft);
    draft.qualityScore = quality.score;
    draft.qualityNotes = [...quality.blocking, ...quality.notes];

    if (quality.blocking.length > 0) {
      draft.status = "draft";
      await saveDraft(draft);
      await bumpDailyCounter("blogsGenerated");
      await saveGenerationJob({
        ...job,
        status: "draft-ready",
        generatedDraftId: draft.id,
        qualityScore: quality.score,
        completedAt: new Date().toISOString(),
        lockedBy: null,
        lockedAt: null,
        leaseExpiresAt: null,
        errorMessage: quality.blocking.join("; "),
      });
      await addSeoBlogLog({
        type: "blog_generated",
        message: `Draft ${draft.slug} needs fixes: ${quality.blocking.join("; ")}`,
        resourceId: draft.id,
      });
      return { ok: true };
    }

    await saveDraft(draft);
    await bumpDailyCounter("blogsGenerated");
    if (draft.featuredImageUrl) await bumpDailyCounter("imagesGenerated");

    let finalStatus: AiBlogGenerationJob["status"] = "draft-ready";
    const imageBlocksPublish =
      draft.imageMeta?.imageStatus === "needs_manual_review" ||
      draft.imageMeta?.imageStatus === "rejected" ||
      (draft.imageMeta != null &&
        ((draft.imageMeta.relevanceScore ?? 100) < 90 ||
          (draft.imageMeta.uniquenessScore ?? 100) < 85 ||
          (draft.imageMeta.overallImageScore ?? 100) < 88));

    if (
      settings.autoPublish &&
      !imageBlocksPublish &&
      quality.score >= settings.minAutoPublishQualityScore &&
      (settings.blogsPublishedDate !== day ||
        (settings.blogsPublishedToday ?? 0) < settings.maxBlogsPublishedPerDay)
    ) {
      const db = getAdminDb();
      if (db) {
        const post = seoBlogDraftToFirestorePost(draft, true);
        await db
          .collection("blogPosts")
          .doc(post.slug)
          .set(blogPostToFirestorePayload(post), { merge: true });
        draft.status = "published";
        draft.publishedAt = new Date().toISOString();
        draft.publishedBlogSlug = post.slug;
        await saveDraft(draft);
        await bumpDailyCounter("blogsPublished");
        revalidatePath(`/blog/${post.slug}`);
        revalidatePath("/blog");
        revalidatePath("/sitemap.xml");
        finalStatus = "published";
      }
    }

    await saveGenerationJob({
      ...job,
      status: finalStatus,
      generatedDraftId: draft.id,
      generatedBlogSlug: draft.publishedBlogSlug,
      qualityScore: quality.score,
      completedAt: new Date().toISOString(),
      lockedBy: null,
      lockedAt: null,
      leaseExpiresAt: null,
      promptVersion: PROMPT_VERSION,
    });
    await addSeoBlogLog({
      type: "blog_generated",
      message: `Generated draft ${draft.slug} (quality ${quality.score})`,
      resourceId: draft.id,
    });
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Generation failed";
    const failed =
      (job.attempts || 1) >= (job.maximumAttempts || 3)
        ? "failed"
        : "waiting";
    await saveGenerationJob({
      ...job,
      status: failed,
      errorMessage: message,
      lockedBy: null,
      lockedAt: null,
      leaseExpiresAt: null,
    });
    await addSeoBlogLog({
      type: "job_failed",
      message,
      resourceId: job.id,
      error: message,
    });
    return { ok: false, error: message };
  }
}

export type ProcessGenerationQueueResult = {
  processed: number;
  errors: string[];
  reconciled: number;
  waitingCount: number;
  skippedReason?: string;
};

export async function processGenerationQueue(
  maxJobs = 2,
  opts?: { skipPauseCheck?: boolean },
): Promise<ProcessGenerationQueueResult> {
  const settings = await getSeoBlogSettings();
  const reconciled = await reconcileStuckGenerationJobs();
  const waitingCount = (await listGenerationJobs("waiting", 200)).length;

  if (!opts?.skipPauseCheck && settings.pauseGenerationQueue === true) {
    return {
      processed: 0,
      errors: ["Generation queue is paused — click Resume queue first"],
      reconciled,
      waitingCount,
      skippedReason: "queue_paused",
    };
  }

  const day = todayIst();
  const generatedToday =
    settings.blogsGeneratedDate === day
      ? (settings.blogsGeneratedToday ?? 0)
      : 0;
  if (generatedToday >= settings.maxBlogsGeneratedPerDay) {
    return {
      processed: 0,
      errors: [
        `Daily generation cap reached (${generatedToday}/${settings.maxBlogsGeneratedPerDay} today IST)`,
      ],
      reconciled,
      waitingCount,
      skippedReason: "daily_cap",
    };
  }

  if (!getAdminDb()) {
    return {
      processed: 0,
      errors: ["Firebase Admin is not configured on the server"],
      reconciled,
      waitingCount,
      skippedReason: "no_admin_db",
    };
  }

  const errors: string[] = [];
  let processed = 0;
  const remainingCap = settings.maxBlogsGeneratedPerDay - generatedToday;

  for (let i = 0; i < maxJobs && processed < remainingCap; i++) {
    const job = await claimNextGenerationJob(opts);
    if (!job) {
      if (processed === 0 && waitingCount > 0) {
        errors.push(
          "Could not claim a waiting job — try again or delete stuck rows",
        );
      }
      break;
    }
    const result = await processGenerationJob(job);
    processed += 1;
    if (!result.ok && result.error) errors.push(result.error);
  }

  return {
    processed,
    errors,
    reconciled,
    waitingCount,
    skippedReason:
      processed === 0 && waitingCount > 0 && errors.length === 0
        ? "claim_failed"
        : undefined,
  };
}
