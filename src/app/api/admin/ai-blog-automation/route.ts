import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  getSeoBlogSettings,
  getSeoBlogDashboardCounts,
  listPendingClusters,
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
import { runScheduledAutomation, startScheduledAutomation, stopScheduledAutomation } from "@/lib/seo-blog-center/scheduled-automation";
import { runAutoApprovePublishAutomation } from "@/lib/seo-blog-center/auto-approve-publish";
import type { SeoBlogCenterSettings } from "@/lib/seo-blog-center/types";
import { getAllServicesServer } from "@/lib/get-services-server";
import { fallbackServices } from "@/data/services";

export const runtime = "nodejs";
export const maxDuration = 300;

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
    const clusters = await listPendingClusters(300);
    return NextResponse.json({ clusters });
  }
  if (view === "jobs") {
    return NextResponse.json({ jobs: await listGenerationJobs(undefined, 300) });
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

  if (view === "summary") {
    const [keywordsSample, clusters, jobs, drafts, dashboardCounts] =
      await Promise.all([
        listKeywords(undefined, 200),
        listPendingClusters(300),
        listGenerationJobs(undefined, 400),
        listDrafts(undefined, 80),
        getSeoBlogDashboardCounts(),
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
        keywords: dashboardCounts.keywords,
        pendingKeywords: dashboardCounts.pendingKeywords,
        clusters: dashboardCounts.pendingClusters,
        pendingClusters: dashboardCounts.pendingClusters,
        waitingJobs: dashboardCounts.waitingJobs,
        failedJobs: dashboardCounts.failedJobs,
        drafts: dashboardCounts.drafts,
        publishedDrafts: dashboardCounts.publishedDrafts,
      },
      keywords: keywordsSample,
      clusters,
      jobs: jobs.slice(0, 150),
      drafts: drafts.slice(0, 40),
      logs: [],
    });
  }

  const [keywords, clusters, jobs, drafts, logs, dashboardCounts] =
    await Promise.all([
      listKeywords(undefined, 200),
      listPendingClusters(300),
      listGenerationJobs(undefined, 200),
      listDrafts(undefined, 80),
      listLogs(40),
      getSeoBlogDashboardCounts(),
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
      keywords: dashboardCounts.keywords,
      pendingKeywords: dashboardCounts.pendingKeywords,
      clusters: dashboardCounts.pendingClusters,
      pendingClusters: dashboardCounts.pendingClusters,
      waitingJobs: dashboardCounts.waitingJobs,
      failedJobs: dashboardCounts.failedJobs,
      drafts: dashboardCounts.drafts,
      publishedDrafts: dashboardCounts.publishedDrafts,
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
    const processAll = body.processAll === true;
    const maxJobs = processAll
      ? Math.min(5, Math.max(1, Number(body.maxJobs) || 1))
      : Math.min(20, Math.max(1, Number(body.maxJobs) || 10));
    const result = await processGenerationQueue(maxJobs, {
      skipPauseCheck: true,
      skipDailyCap: processAll || body.skipDailyCap === true,
    });
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

  if (body.action === "startAutomation") {
    const frequency = String(body.frequency || "daily");
    if (!["daily", "weekly", "monthly"].includes(frequency)) {
      return NextResponse.json({ error: "Invalid frequency" }, { status: 400 });
    }
    const imageMode = body.imageMode === "openai" ? "openai" : "stock";
    const serviceMode = body.serviceMode === "selected" ? "selected" : "all";
    const serviceSlugs = Array.isArray(body.serviceSlugs)
      ? body.serviceSlugs.map(String).filter(Boolean)
      : [];
    if (serviceMode === "selected" && serviceSlugs.length === 0) {
      return NextResponse.json(
        { error: "Select at least one service" },
        { status: 400 },
      );
    }
    const { settings, run } = await startScheduledAutomation(
      {
        frequency: frequency as "daily" | "weekly" | "monthly",
        postsPerDay: Number(body.postsPerDay) || 5,
        keywordsPerService: Number(body.keywordsPerService) || 50,
        serviceMode,
        serviceSlugs,
        imageMode,
      },
      auth.uid || "admin",
    );
    return NextResponse.json({ ok: true, settings, run });
  }

  if (body.action === "stopAutomation") {
    const settings = await stopScheduledAutomation();
    return NextResponse.json({ ok: true, settings });
  }

  if (body.action === "runAutomationNow") {
    const run = await runScheduledAutomation({
      actorId: auth.uid || "admin",
      force: true,
    });
    const auto = await runAutoApprovePublishAutomation(auth.uid || "admin");
    const queue = await processGenerationQueue(
      Math.min(
        (await getSeoBlogSettings()).automationPostsPerDay ?? 5,
        8,
      ),
      { skipPauseCheck: true },
    );
    return NextResponse.json({ ok: true, run, autoApprove: auto, queue });
  }

  if (body.action === "autoApprovePending") {
    const auto = await runAutoApprovePublishAutomation(auth.uid || "admin");
    const queue = await processGenerationQueue(
      Math.min(8, Number(body.maxJobs) || 5),
      { skipPauseCheck: true },
    );
    return NextResponse.json({ ok: true, autoApprove: auto, queue });
  }

  if (body.action === "publishQueueJobs") {
    const jobIds = Array.isArray(body.jobIds)
      ? body.jobIds.map(String).filter(Boolean)
      : [];
    if (jobIds.length === 0) {
      return NextResponse.json({ error: "Select at least one job" }, { status: 400 });
    }
    if (jobIds.length > 50) {
      return NextResponse.json(
        { error: "Max 50 jobs per bulk publish" },
        { status: 400 },
      );
    }

    const {
      getGenerationJobById,
      saveGenerationJob,
      getDraftById,
      saveDraft,
      listDrafts,
    } = await import("@/lib/seo-blog-center/store");
    const { publishBlogPostNow } = await import(
      "@/lib/blog-automation/scheduled-posts"
    );
    const { seoBlogDraftToFirestorePost } = await import(
      "@/lib/seo-blog-center/draft-to-post"
    );
    const { blogPostToFirestorePayload } = await import("@/lib/blog-firestore");
    const { getAdminDb } = await import("@/lib/firebase-admin");
    const { revalidatePath } = await import("next/cache");

    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    }

    const published: string[] = [];
    const failed: { jobId: string; error: string }[] = [];
    const now = new Date().toISOString();

    for (const jobId of jobIds.slice(0, 50)) {
      try {
        const job = await getGenerationJobById(jobId);
        if (!job) {
          failed.push({ jobId, error: "Job not found" });
          continue;
        }
        if (job.status === "published") {
          failed.push({ jobId, error: "Already published" });
          continue;
        }

        let draft = job.generatedDraftId
          ? await getDraftById(job.generatedDraftId)
          : null;
        const slug =
          job.generatedBlogSlug?.trim() ||
          draft?.slug?.trim() ||
          draft?.publishedBlogSlug?.trim() ||
          "";

        if (!slug) {
          failed.push({ jobId, error: "No blog slug on this job" });
          continue;
        }

        const postRef = db.collection("blogPosts").doc(slug);
        const postSnap = await postRef.get();

        if (!postSnap.exists) {
          if (!draft) {
            draft =
              (await listDrafts(undefined, 200)).find(
                (d) => d.slug === slug || d.publishedBlogSlug === slug,
              ) ?? null;
          }
          if (!draft?.title?.trim() || !draft?.content?.trim()) {
            failed.push({
              jobId,
              error: "Draft content missing — open Edit first",
            });
            continue;
          }
          const post = seoBlogDraftToFirestorePost(draft, false);
          await postRef.set(blogPostToFirestorePayload(post), { merge: true });
        } else if (postSnap.data()?.published === true) {
          await saveGenerationJob({
            ...job,
            status: "published",
            generatedBlogSlug: slug,
            completedAt: job.completedAt || now,
          });
          if (draft && draft.status !== "published") {
            await saveDraft({
              ...draft,
              status: "published",
              publishedAt: now,
              publishedBlogSlug: slug,
              updatedAt: now,
            });
          }
          published.push(slug);
          continue;
        }

        const pub = await publishBlogPostNow(slug);
        if (!pub.ok) {
          failed.push({ jobId, error: pub.error || "Publish failed" });
          continue;
        }

        await saveGenerationJob({
          ...job,
          status: "published",
          generatedBlogSlug: slug,
          completedAt: job.completedAt || now,
        });

        if (!draft && job.generatedDraftId) {
          draft = await getDraftById(job.generatedDraftId);
        }
        if (!draft) {
          draft =
            (await listDrafts(undefined, 200)).find(
              (d) => d.slug === slug || d.publishedBlogSlug === slug,
            ) ?? null;
        }
        if (draft) {
          await saveDraft({
            ...draft,
            status: "published",
            publishedAt: now,
            publishedBlogSlug: slug,
            updatedAt: now,
          });
        }

        await addSeoBlogLog({
          type: "blog_published",
          message: `Bulk published from queue: /blog/${slug}`,
          resourceId: jobId,
        });

        published.push(slug);
      } catch (e) {
        failed.push({
          jobId,
          error: e instanceof Error ? e.message : "Publish failed",
        });
      }
    }

    if (published.length > 0) {
      revalidatePath("/blog");
      for (const slug of published) {
        revalidatePath(`/blog/${slug}`);
      }
      revalidatePath("/sitemap.xml");
    }

    return NextResponse.json({
      ok: true,
      published,
      failed,
      successCount: published.length,
      failCount: failed.length,
    });
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
