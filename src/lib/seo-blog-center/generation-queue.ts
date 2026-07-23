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
import { PROMPT_VERSION, type AiBlogGenerationJob } from "@/lib/seo-blog-center/types";
import { blogPostToFirestorePayload } from "@/lib/blog-firestore";
import { revalidatePath } from "next/cache";

const LEASE_MS = 4 * 60 * 1000;

function workerId(): string {
  return `worker_${process.env.VERCEL_REGION || "local"}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Claim next waiting job with Firestore transaction lease.
 */
export async function claimNextGenerationJob(): Promise<AiBlogGenerationJob | null> {
  const db = getAdminDb();
  if (!db) return null;
  const settings = await getSeoBlogSettings();
  if (settings.pauseGenerationQueue) return null;

  const waiting = await listGenerationJobs("waiting", 20);
  const now = Date.now();
  const stale = (await listGenerationJobs(undefined, 50)).filter(
    (j) =>
      j.leaseExpiresAt &&
      new Date(j.leaseExpiresAt).getTime() < now &&
      (j.status === "generating-content" ||
        j.status === "generating-image" ||
        j.status === "validating"),
  );
  const candidates = [...stale, ...waiting];
  if (candidates.length === 0) return null;

  const target = candidates[0]!;
  const ref = db.collection(SEO_BLOG_COLLECTIONS.jobs).doc(target.id);
  const wid = workerId();

  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("missing");
      const data = snap.data() as AiBlogGenerationJob;
      const leaseOk =
        !data.leaseExpiresAt || new Date(data.leaseExpiresAt).getTime() < Date.now();
      if (
        data.status !== "waiting" &&
        !(
          leaseOk &&
          (data.status === "generating-content" ||
            data.status === "generating-image" ||
            data.status === "validating")
        )
      ) {
        throw new Error("busy");
      }
      const locked: Partial<AiBlogGenerationJob> = {
        status: "generating-content",
        lockedBy: wid,
        lockedAt: new Date().toISOString(),
        leaseExpiresAt: new Date(Date.now() + LEASE_MS).toISOString(),
        startedAt: data.startedAt || new Date().toISOString(),
        attempts: (data.attempts || 0) + 1,
      };
      tx.set(ref, stripUndefinedDeep(locked), { merge: true });
    });
    return getGenerationJobById(target.id);
  } catch {
    return null;
  }
}

export async function processGenerationJob(
  job: AiBlogGenerationJob,
): Promise<{ ok: boolean; error?: string }> {
  const settings = await getSeoBlogSettings();
  const day = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
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
      status:
        job.generateAiImage !== false && settings.generateImages
          ? "generating-image"
          : "validating",
      leaseExpiresAt: new Date(Date.now() + LEASE_MS).toISOString(),
    });

    const draft = await generateSeoBlogDraft({
      keyword,
      seoMeta: meta,
      generateAiImage: job.generateAiImage !== false && settings.generateImages,
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

export async function processGenerationQueue(maxJobs = 2): Promise<{
  processed: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let processed = 0;
  for (let i = 0; i < maxJobs; i++) {
    const job = await claimNextGenerationJob();
    if (!job) break;
    const result = await processGenerationJob(job);
    processed += 1;
    if (!result.ok && result.error) errors.push(result.error);
  }
  return { processed, errors };
}
