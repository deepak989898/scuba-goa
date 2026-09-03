import { getServiceBySlugServer } from "@/lib/get-services-server";
import {
  addSeoBlogLog,
  getClusterById,
  getKeywordById,
  getSeoBlogSettings,
  listClusters,
  listGenerationJobs,
  saveCluster,
  saveGenerationJob,
  saveKeyword,
  updateSeoBlogSettings,
} from "@/lib/seo-blog-center/store";
import {
  MAX_WAITING_GENERATION_JOBS,
  PROMPT_VERSION,
  type AiBlogGenerationJob,
  type SeoKeywordCluster,
} from "@/lib/seo-blog-center/types";

/** Rough estimate — labeled as estimate in UI. */
export function estimateBatchCostUsd(
  clusterCount: number,
  generateAiImage: boolean,
): number {
  const per = generateAiImage ? 0.12 : 0.08;
  return Math.round(clusterCount * per * 100) / 100;
}

export function clusterHasConflicts(cluster: SeoKeywordCluster): boolean {
  if (cluster.conflicts && cluster.conflicts.length > 0) return true;
  if (cluster.conflictingUrls && cluster.conflictingUrls.length > 0) return true;
  return false;
}

export type ApproveClustersResult = {
  approved: number;
  skippedConflicts: number;
  skippedOther: number;
  jobsCreated: number;
  estimatedCostUsd: number;
  generateAiImage: boolean;
  jobIds: string[];
};

/**
 * Approve clusters into the generation queue (same behavior as admin approve API).
 * Optionally skips conflict clusters for automation safety.
 */
export async function approveClustersToQueue(opts: {
  clusterIds: string[];
  actorId: string;
  generateAiImage: boolean;
  skipConflicts?: boolean;
  /** When true (default), only `pending` clusters are approved. */
  requirePending?: boolean;
  /** Cap how many clusters to approve in this call (after filtering). */
  maxApprove?: number;
}): Promise<ApproveClustersResult> {
  const {
    actorId,
    generateAiImage,
    skipConflicts = false,
    requirePending = true,
    maxApprove = Number.POSITIVE_INFINITY,
  } = opts;

  const now = new Date().toISOString();
  const jobs: AiBlogGenerationJob[] = [];
  let approved = 0;
  let skippedConflicts = 0;
  let skippedOther = 0;

  for (const id of opts.clusterIds) {
    if (approved >= maxApprove) break;

    const cluster = await getClusterById(id);
    if (!cluster) {
      skippedOther += 1;
      continue;
    }
    if (requirePending && cluster.status !== "pending") {
      skippedOther += 1;
      continue;
    }
    if (cluster.status === "queued" || cluster.status === "generated") {
      skippedOther += 1;
      continue;
    }
    if (skipConflicts && clusterHasConflicts(cluster)) {
      skippedConflicts += 1;
      continue;
    }
    if (cluster.contentType === "optimize_service_page") {
      skippedOther += 1;
      continue;
    }

    const service = await getServiceBySlugServer(cluster.serviceSlug);
    const job: AiBlogGenerationJob = {
      id: `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      clusterId: cluster.id,
      serviceSlug: cluster.serviceSlug,
      serviceName: service?.title || cluster.serviceSlug,
      primaryKeyword: cluster.primaryKeyword,
      secondaryKeywords: cluster.secondaryKeywords,
      questions: cluster.questionKeywords,
      searchIntent: cluster.intent,
      contentType: cluster.contentType,
      language: cluster.language === "hi" ? "hi" : "en",
      location: cluster.location,
      status: "waiting",
      priority: cluster.opportunityScore,
      attempts: 0,
      maximumAttempts: 3,
      createdBy: actorId,
      createdAt: now,
      estimatedCostUsd: estimateBatchCostUsd(1, generateAiImage),
      promptVersion: PROMPT_VERSION,
      generateAiImage,
    };
    await saveGenerationJob(job);
    jobs.push(job);
    await saveCluster({
      ...cluster,
      status: "queued",
      approvedAt: now,
      approvedBy: actorId,
      updatedAt: now,
    });
    for (const kid of cluster.keywordIds) {
      const kw = await getKeywordById(kid);
      if (kw) {
        await saveKeyword({
          ...kw,
          status: "queued",
          approvedAt: now,
          approvedBy: actorId,
          updatedAt: now,
        });
      }
    }
    approved += 1;
  }

  const estimatedCostUsd = estimateBatchCostUsd(jobs.length, generateAiImage);
  if (approved > 0) {
    await addSeoBlogLog({
      type: "cluster_approved",
      message: `Approved ${approved} clusters → ${jobs.length} jobs (AI image: ${generateAiImage ? "on" : "off"}, skipped conflicts: ${skippedConflicts}, est. $${estimatedCostUsd})`,
    });
  }

  return {
    approved,
    skippedConflicts,
    skippedOther,
    jobsCreated: jobs.length,
    estimatedCostUsd,
    generateAiImage,
    jobIds: jobs.map((j) => j.id),
  };
}

/**
 * When auto-approve automation is enabled: queue pending clusters without conflicts,
 * start generation immediately (admin/cron need not click Process), then autoPublish handles rest.
 */
export async function runAutoApprovePublishAutomation(actorId = "system-auto"): Promise<{
  mode: "off" | "with_ai_image" | "without_image";
  result: ApproveClustersResult | null;
  processed?: number;
}> {
  const settings = await getSeoBlogSettings();
  const withImage = settings.autoApprovePublishWithAiImage === true;
  const withoutImage = settings.autoApprovePublishWithoutImage === true;

  if (!withImage && !withoutImage) {
    return { mode: "off", result: null };
  }

  // Mutual exclusivity: with-image wins if both somehow true.
  const mode = withImage ? "with_ai_image" : "without_image";
  const generateAiImage = mode === "with_ai_image";

  // Ensure publish path is enabled for automation.
  const patch: Parameters<typeof updateSeoBlogSettings>[0] = {};
  if (!settings.autoPublish) patch.autoPublish = true;
  if (generateAiImage && settings.generateImages === false) {
    patch.generateImages = true;
  }
  if (Object.keys(patch).length > 0) {
    await updateSeoBlogSettings(patch);
  }

  const waitingJobs = (await listGenerationJobs("waiting", 200)).length;

  /** Queue pending clusters even when today's generation cap is full — they process on later runs. */
  const queueSlots = Math.max(0, MAX_WAITING_GENERATION_JOBS - waitingJobs);

  if (queueSlots <= 0) {
    return {
      mode,
      result: {
        approved: 0,
        skippedConflicts: 0,
        skippedOther: 0,
        jobsCreated: 0,
        estimatedCostUsd: 0,
        generateAiImage,
        jobIds: [],
      },
    };
  }

  const pending = (await listClusters(200))
    .filter((c) => c.status === "pending")
    .sort((a, b) => (b.opportunityScore ?? 0) - (a.opportunityScore ?? 0));

  const eligibleIds = pending
    .filter((c) => !clusterHasConflicts(c))
    .filter((c) => c.contentType !== "optimize_service_page")
    .map((c) => c.id);

  const conflictCount = pending.filter((c) => clusterHasConflicts(c)).length;
  const remainingCap = queueSlots;

  if (eligibleIds.length === 0) {
    return {
      mode,
      result: {
        approved: 0,
        skippedConflicts: conflictCount,
        skippedOther: pending.length - conflictCount,
        jobsCreated: 0,
        estimatedCostUsd: 0,
        generateAiImage,
        jobIds: [],
      },
    };
  }

  const result = await approveClustersToQueue({
    clusterIds: eligibleIds,
    actorId,
    generateAiImage,
    skipConflicts: true,
    maxApprove: remainingCap,
  });

  // Preserve accurate conflict skip count for logging/UI.
  result.skippedConflicts = Math.max(result.skippedConflicts, conflictCount);

  let processed = 0;
  if (result.jobsCreated > 0 && !settings.pauseGenerationQueue) {
    try {
      const { processGenerationQueue } = await import(
        "@/lib/seo-blog-center/generation-queue"
      );
      const gen = await processGenerationQueue(
        Math.min(Math.max(result.jobsCreated, 1), 8),
        { skipPauseCheck: true },
      );
      processed = gen.processed;
    } catch (e) {
      console.error("[auto-approve] generation start failed", e);
    }
  }

  return { mode, result, processed };
}
