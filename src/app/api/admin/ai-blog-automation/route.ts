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
} from "@/lib/seo-blog-center/store";
import { isGoogleAdsConfigured } from "@/lib/seo-blog-center/providers/google-ads";
import { processGenerationQueue } from "@/lib/seo-blog-center/generation-queue";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(req.url);
  const view = url.searchParams.get("view") || "dashboard";

  const settings = await getSeoBlogSettings();

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
      providers: {
        googleAds: isGoogleAdsConfigured(),
        gsc: Boolean(process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL?.trim()),
        openai: Boolean(process.env.OPENAI_API_KEY?.trim()),
      },
    });
  }

  const [keywords, clusters, jobs, drafts, logs] = await Promise.all([
    listKeywords(undefined, 200),
    listClusters(100),
    listGenerationJobs(undefined, 100),
    listDrafts(undefined, 80),
    listLogs(40),
  ]);

  return NextResponse.json({
    settings,
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
    keywords: keywords.slice(0, 50),
    clusters: clusters.slice(0, 30),
    jobs: jobs.slice(0, 30),
    drafts: drafts.slice(0, 20),
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

  const settings = await updateSeoBlogSettings(body as never);
  return NextResponse.json({ ok: true, settings });
}
