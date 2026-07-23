import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  approveClustersToQueue,
  estimateBatchCostUsd,
} from "@/lib/seo-blog-center/auto-approve-publish";
import {
  addSeoBlogLog,
  deleteCluster,
  deleteKeyword,
  getClusterById,
  getSeoBlogSettings,
  saveCluster,
  saveKeyword,
  getKeywordById,
} from "@/lib/seo-blog-center/store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: {
    clusterIds?: string[];
    confirmCost?: boolean;
    action?: "approve" | "reject" | "preview" | "delete";
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
        : "Free stock featured images: Pexels → Pixabay → Unsplash, saved as WebP on Firebase (fast + SEO ALT).",
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
  let rejected = 0;
  let deleted = 0;

  if (action === "delete" || action === "reject") {
    for (const id of clusterIds) {
      const cluster = await getClusterById(id);
      if (!cluster) continue;

      if (action === "delete") {
        for (const kid of cluster.keywordIds || []) {
          try {
            await deleteKeyword(kid);
          } catch {
            /* keyword may already be gone */
          }
        }
        await deleteCluster(cluster.id);
        deleted += 1;
        continue;
      }

      await saveCluster({
        ...cluster,
        status: "rejected",
        updatedAt: now,
      });
      for (const kid of cluster.keywordIds || []) {
        const kw = await getKeywordById(kid);
        if (kw) {
          await saveKeyword({
            ...kw,
            status: "rejected",
            updatedAt: now,
          });
        }
      }
      rejected += 1;
    }

    await addSeoBlogLog({
      type: "cluster_approved",
      message:
        action === "reject"
          ? `Rejected ${rejected} clusters`
          : `Deleted ${deleted} clusters`,
    });

    return NextResponse.json({
      ok: true,
      approved: 0,
      rejected,
      deleted,
      jobsCreated: 0,
      estimatedCostUsd: 0,
      costIsEstimate: true,
      generateAiImage,
      jobIds: [],
    });
  }

  // Manual approve: admin selected clusters explicitly (including conflicts if they want).
  const result = await approveClustersToQueue({
    clusterIds,
    actorId,
    generateAiImage,
    skipConflicts: false,
    requirePending: false,
  });

  return NextResponse.json({
    ok: true,
    approved: result.approved,
    rejected: 0,
    deleted: 0,
    jobsCreated: result.jobsCreated,
    estimatedCostUsd: result.estimatedCostUsd,
    costIsEstimate: true,
    generateAiImage: result.generateAiImage,
    jobIds: result.jobIds,
  });
}
