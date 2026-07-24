import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  getSeoBlogSettings,
  listClusters,
  listDrafts,
  listGenerationJobs,
  listKeywords,
  listLogs,
  updateSeoBlogSettings,
  deleteGenerationJob,
  addSeoBlogLog,
} from "@/lib/seo-blog-center/store";
import { isGoogleAdsConfigured } from "@/lib/seo-blog-center/providers/google-ads";
import { processGenerationQueue } from "@/lib/seo-blog-center/generation-queue";
import { runAutoApprovePublishAutomation } from "@/lib/seo-blog-center/auto-approve-publish";
import type { SeoBlogCenterSettings } from "@/lib/seo-blog-center/types";
import { getAllServicesServer } from "@/lib/get-services-server";
import { fallbackServices } from "@/data/services";

export const runtime = "nodejs";
export const maxDuration = 120;

function buildServiceOptions(
  live: { slug: string; title: string }[],
): { slug: string; name: string }[] {
  const map = new Map<string, string>();
  for (const s of fallbackServices) {
    map.set(s.slug, s.title);
  }
  for (const s of live) {
    if (s.slug) map.set(s.slug, s.title || s.slug);
  }
  return [...map.entries()]
    .map(([slug, name]) => ({ slug, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(req.url);
  const view = url.searchParams.get("view") || "dashboard";

  const settings = await getSeoBlogSettings();
  const allServices = await getAllServicesServer();
  const services = buildServiceOptions(
    allServices.map((s) => ({ slug: s.slug, title: s.title })),
  );

  if (view === "keywords") {
    return NextResponse.json({ keywords: await listKeywords(undefined, 300) });
  }
  if (view === "clusters") {
    return NextResponse.json({ clusters: await listClusters(150) });
  }
  if (view === "jobs") {
    return NextResponse.json({ jobs: await listGenerationJobs(undefined, 150) });
  }
  if (view === "drafts") {
    return NextResponse.json({ drafts: await listDrafts(undefined, 100) });
  }
  if (view === "logs") {
    return NextResponse.json({ logs: await listLogs(80) });
  }
  if (view === "settings") {
    return NextResponse.json({
      settings,
      services,
      providers: {
        googleAds: isGoogleAdsConfigured(),
        gsc: Boolean(process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL?.trim()),
        openai: Boolean(process.env.OPENAI_API_KEY?.trim()),
      },
    });
  }

  const [keywords, clusters, jobs, drafts, logs] = await Promise.all([
    listKeywords(undefined, 200),
    listClusters(150),
    listGenerationJobs(undefined, 100),
    listDrafts(undefined, 80),
    listLogs(40),
  ]);

  return NextResponse.json({
    settings,
    services,
    providers: {
      googleAds: isGoogleAdsConfigured(),
      gsc: Boolean(process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL?.trim()),
      openai: Boolean(process.env.OPENAI_API_KEY?.trim()),
    },
    stats: {
      keywords: keywords.length,
      pendingKeywords: keywords.filter((k) => k.status === "pending").length,
      clusters: clusters.length,
      pendingClusters: clusters.filter((c) => c.status === "pending").length,
      waitingJobs: jobs.filter((j) => j.status === "waiting").length,
      failedJobs: jobs.filter((j) => j.status === "failed").length,
      drafts: drafts.filter((d) => d.status !== "published").length,
      publishedDrafts: drafts.filter((d) => d.status === "published").length,
    },
    keywords,
    clusters,
    jobs: jobs.slice(0, 50),
    drafts: drafts.slice(0, 40),
    logs,
  });
}

export async function PATCH(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "processQueue") {
    const result = await processGenerationQueue(Number(body.maxJobs) || 2);
    return NextResponse.json({ ok: true, ...result });
  }

  if (body.action === "pauseQueue") {
    const settings = await updateSeoBlogSettings({ pauseGenerationQueue: true });
    return NextResponse.json({ ok: true, settings });
  }
  if (body.action === "resumeQueue") {
    const settings = await updateSeoBlogSettings({ pauseGenerationQueue: false });
    return NextResponse.json({ ok: true, settings });
  }

  if (body.action === "deleteJobs") {
    const jobIds = Array.isArray(body.jobIds)
      ? body.jobIds.map(String).filter(Boolean)
      : [];
    if (jobIds.length === 0) {
      return NextResponse.json({ error: "Select at least one job" }, { status: 400 });
    }
    let deleted = 0;
    for (const id of jobIds.slice(0, 100)) {
      try {
        await deleteGenerationJob(id);
        deleted += 1;
      } catch {
        /* ignore missing */
      }
    }
    await addSeoBlogLog({
      type: "cluster_approved",
      message: `Deleted ${deleted} generation queue job(s)`,
    });
    return NextResponse.json({ ok: true, deleted });
  }

  if (body.action === "runAutoApprove") {
    const auto = await runAutoApprovePublishAutomation(auth.uid || "admin-auto");
    return NextResponse.json({ ok: true, ...auto });
  }

  if (body.action === "markJobPublished") {
    const jobId = String(body.jobId ?? "").trim();
    const slug = String(body.slug ?? "").trim();
    if (!jobId) {
      return NextResponse.json({ error: "jobId required" }, { status: 400 });
    }
    const {
      getGenerationJobById,
      saveGenerationJob,
      getDraftById,
      saveDraft,
      listDrafts,
    } = await import("@/lib/seo-blog-center/store");
    const job = await getGenerationJobById(jobId);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    const now = new Date().toISOString();
    await saveGenerationJob({
      ...job,
      status: "published",
      generatedBlogSlug: slug || job.generatedBlogSlug,
      completedAt: job.completedAt || now,
    });
    let draft = job.generatedDraftId
      ? await getDraftById(job.generatedDraftId)
      : null;
    if (!draft && slug) {
      draft =
        (await listDrafts(undefined, 100)).find(
          (d) => d.slug === slug || d.publishedBlogSlug === slug,
        ) ?? null;
    }
    if (draft) {
      await saveDraft({
        ...draft,
        status: "published",
        publishedAt: now,
        publishedBlogSlug: slug || draft.slug,
        updatedAt: now,
      });
    }
    await addSeoBlogLog({
      type: "blog_published",
      message: `Manually published from queue: /blog/${slug || job.generatedBlogSlug || job.id}`,
      resourceId: jobId,
    });
    return NextResponse.json({ ok: true });
  }

  const patch = { ...body } as Partial<SeoBlogCenterSettings> & {
    action?: unknown;
  };
  delete patch.action;

  // Mutual exclusivity + enable auto-publish when either automation toggle turns on.
  if (patch.autoApprovePublishWithAiImage === true) {
    patch.autoApprovePublishWithoutImage = false;
    patch.autoPublish = true;
    patch.generateImages = true;
  } else if (patch.autoApprovePublishWithoutImage === true) {
    patch.autoApprovePublishWithAiImage = false;
    patch.autoPublish = true;
  }

  const settings = await updateSeoBlogSettings(patch);

  let autoApprove: Awaited<ReturnType<typeof runAutoApprovePublishAutomation>> | null =
    null;
  if (
    patch.autoApprovePublishWithAiImage === true ||
    patch.autoApprovePublishWithoutImage === true
  ) {
    autoApprove = await runAutoApprovePublishAutomation(auth.uid || "admin-auto");
  }

  return NextResponse.json({ ok: true, settings, autoApprove });
}
