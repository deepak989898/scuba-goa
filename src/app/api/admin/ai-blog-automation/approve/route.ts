import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  addSeoBlogLog,
  getClusterById,
  getSeoBlogSettings,
  saveCluster,
  saveGenerationJob,
  saveKeyword,
  getKeywordById,
} from "@/lib/seo-blog-center/store";
import {
  PROMPT_VERSION,
  type AiBlogGenerationJob,
} from "@/lib/seo-blog-center/types";
import { getServiceBySlugServer } from "@/lib/get-services-server";

export const runtime = "nodejs";

/** Rough estimate — labeled as estimate in UI. */
function estimateBatchCostUsd(
  clusterCount: number,
  generateAiImage: boolean,
): number {
  const per = generateAiImage ? 0.12 : 0.08;
  return Math.round(clusterCount * per * 100) / 100;
}

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: {
    clusterIds?: string[];
    confirmCost?: boolean;
    action?: "approve" | "reject" | "preview";
    /** Default true — set false to skip AI featured image (manual upload later). */
    generateAiImage?: boolean;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const clusterIds = Array.isArray(body.clusterIds)
    ? body.clusterIds.map(String).filter(Boolean)
    : [];
  if (clusterIds.length === 0) {
    return NextResponse.json({ error: "Select at least one cluster" }, { status: 400 });
  }

  const action = body.action || "approve";
  const generateAiImage = body.generateAiImage !== false;
  const settings = await getSeoBlogSettings();
  const estimatedCostUsd = estimateBatchCostUsd(clusterIds.length, generateAiImage);

  if (action === "preview") {
    return NextResponse.json({
      ok: true,
      clusterCount: clusterIds.length,
      estimatedArticles: clusterIds.length,
      estimatedCostUsd,
      costIsEstimate: true,
      generateAiImage,
      autoPublish: settings.autoPublish,
      warning:
        settings.autoPublish
          ? "Auto-publish is ON — only high-quality drafts may go live."
          : "Auto-publish is OFF — drafts will wait for review.",
      imageNote: generateAiImage
        ? "AI featured images will be generated (extra OpenAI image cost)."
        : "No AI image — admin can upload image manually after draft/publish.",
    });
  }

  if (
    action === "approve" &&
    estimatedCostUsd >= settings.estimatedCostConfirmUsd &&
    body.confirmCost !== true
  ) {
    return NextResponse.json(
      {
        error: "Cost confirmation required",
        estimatedCostUsd,
        costIsEstimate: true,
        requiresConfirm: true,
      },
      { status: 402 },
    );
  }

  const actorId = auth.uid || "admin";
  const now = new Date().toISOString();
  const jobs: AiBlogGenerationJob[] = [];
  let approved = 0;
  let rejected = 0;

  for (const id of clusterIds) {
    const cluster = await getClusterById(id);
    if (!cluster) continue;

    if (action === "reject") {
      await saveCluster({
        ...cluster,
        status: "rejected",
        updatedAt: now,
      });
      rejected += 1;
      continue;
    }

    if (cluster.contentType === "optimize_service_page") {
      await saveCluster({
        ...cluster,
        status: "rejected",
        notes: "Marked optimize existing service page — no article queued",
        updatedAt: now,
      });
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

  await addSeoBlogLog({
    type: "cluster_approved",
    message:
      action === "reject"
        ? `Rejected ${rejected} clusters`
        : `Approved ${approved} clusters → ${jobs.length} generation jobs (AI image: ${generateAiImage ? "on" : "off"}, est. $${estimatedCostUsd})`,
  });

  return NextResponse.json({
    ok: true,
    approved,
    rejected,
    jobsCreated: jobs.length,
    estimatedCostUsd,
    costIsEstimate: true,
    generateAiImage,
    jobIds: jobs.map((j) => j.id),
  });
}
