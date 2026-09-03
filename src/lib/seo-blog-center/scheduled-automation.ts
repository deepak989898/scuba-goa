import { getAllServicesServer } from "@/lib/get-services-server";
import { fallbackServices } from "@/data/services";
import { runAutoApprovePublishAutomation } from "@/lib/seo-blog-center/auto-approve-publish";
import { processGenerationQueue } from "@/lib/seo-blog-center/generation-queue";
import { runKeywordResearch } from "@/lib/seo-blog-center/orchestrate-research";
import { ALL_RESEARCH_CATEGORY_IDS } from "@/lib/seo-blog-center/research-categories";
import type { ResearchInput } from "@/lib/seo-blog-center/providers/types";
import {
  addSeoBlogLog,
  bumpDailyCounter,
  getSeoBlogSettings,
  saveCluster,
  saveKeyword,
  updateSeoBlogSettings,
} from "@/lib/seo-blog-center/store";
import type { SeoBlogCenterSettings } from "@/lib/seo-blog-center/types";
import { MAX_BLOGS_PER_DAY_LIMIT } from "@/lib/seo-blog-center/types";

function clampDailyBlogLimit(n: unknown, fallback: number): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(MAX_BLOGS_PER_DAY_LIMIT, Math.max(1, Math.round(v)));
}

function todayIst(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function daysBetweenIstDates(a: string, b: string): number {
  const parse = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.floor((parse(b) - parse(a)) / 86400000);
}

export function shouldRunScheduledAutomation(
  settings: SeoBlogCenterSettings,
  opts?: { force?: boolean },
): boolean {
  if (!settings.automationScheduleEnabled) return false;
  if (opts?.force) return true;

  const today = todayIst();
  const lastDate = settings.automationLastRunDate?.trim();
  if (!lastDate) return true;

  const freq = settings.automationFrequency || "daily";
  if (freq === "daily") return lastDate !== today;

  const days = daysBetweenIstDates(lastDate, today);
  if (freq === "weekly") return days >= 7;
  if (freq === "monthly") return days >= 28;
  return lastDate !== today;
}

export type ScheduledAutomationResult = {
  ok: boolean;
  skipped?: boolean;
  skipReason?: string;
  servicesResearched: number;
  keywordsAdded: number;
  clustersAdded: number;
  autoApprove?: Awaited<ReturnType<typeof runAutoApprovePublishAutomation>>;
  queueProcessed?: number;
  frequency?: string;
  imageMode?: string;
};

export async function runScheduledAutomation(opts?: {
  actorId?: string;
  force?: boolean;
}): Promise<ScheduledAutomationResult> {
  const settings = await getSeoBlogSettings();

  if (!shouldRunScheduledAutomation(settings, { force: opts?.force })) {
    return {
      ok: true,
      skipped: true,
      skipReason: settings.automationScheduleEnabled
        ? "Not due yet for this frequency"
        : "Automation is off",
      servicesResearched: 0,
      keywordsAdded: 0,
      clustersAdded: 0,
    };
  }

  const imageMode = settings.automationImageMode || "stock";
  const postsPerDay = clampDailyBlogLimit(
    settings.automationPostsPerDay ?? settings.maxBlogsPublishedPerDay ?? 5,
    5,
  );
  const keywordsPerService = Math.min(
    250,
    Math.max(10, settings.automationKeywordsPerService ?? postsPerDay * 8),
  );

  // Sync caps + image automation flags from wizard settings.
  await updateSeoBlogSettings({
    maxBlogsGeneratedPerDay: postsPerDay,
    maxBlogsPublishedPerDay: postsPerDay,
    maxImagesPerDay: imageMode === "openai" ? postsPerDay : 0,
    autoPublish: true,
    pauseGenerationQueue: false,
    generateImages: imageMode === "openai",
    autoApprovePublishWithAiImage: imageMode === "openai",
    autoApprovePublishWithoutImage: imageMode === "stock",
  });

  const live = await getAllServicesServer();
  const catalog =
    live.length > 0
      ? live.map((s) => ({ slug: s.slug, title: s.title }))
      : fallbackServices.map((s) => ({ slug: s.slug, title: s.title }));

  const mode = settings.automationServiceMode || "all";
  const picked = new Set(settings.automationServiceSlugs ?? []);
  const services =
    mode === "selected" && picked.size > 0
      ? catalog.filter((s) => picked.has(s.slug))
      : catalog;

  let keywordsAdded = 0;
  let clustersAdded = 0;
  let servicesResearched = 0;

  for (const service of services) {
    const input: ResearchInput = {
      serviceSlug: service.slug,
      serviceName: service.title,
      seedKeyword: `${service.title} in Goa`,
      country: "India",
      state: "Goa",
      city: "",
      language: "en",
      maxKeywords: keywordsPerService,
      minMonthlySearches: 0,
      includeCommercial: true,
      includeInformational: true,
      includeLocal: true,
      includeQuestions: true,
      includeComparison: true,
      includePrice: true,
      includeSeasonal: true,
      includeGsc: settings.includeGscKeywords,
      includeSuggest: settings.includeGoogleSuggest,
      includeAds: settings.includeGoogleAds,
      excludeCovered: true,
      researchCategories: [...ALL_RESEARCH_CATEGORY_IDS],
    };

    try {
      const result = await runKeywordResearch(input);
      for (const kw of result.keywords) await saveKeyword(kw);
      for (const cl of result.clusters) await saveCluster(cl);
      keywordsAdded += result.keywords.length;
      clustersAdded += result.clusters.length;
      servicesResearched += 1;
      await bumpDailyCounter("researchCalls");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await addSeoBlogLog({
        type: "error",
        message: `Scheduled research failed for ${service.slug}: ${msg}`,
        error: msg,
      });
    }
  }

  const autoApprove = await runAutoApprovePublishAutomation(
    opts?.actorId || "scheduled-automation",
  );

  const queue = await processGenerationQueue(
    Math.min(postsPerDay, 8),
    { skipPauseCheck: true },
  );

  const today = todayIst();
  await updateSeoBlogSettings({
    automationLastRunAt: new Date().toISOString(),
    automationLastRunDate: today,
  });

  await addSeoBlogLog({
    type: "pipeline_run",
    message: `Scheduled automation (${settings.automationFrequency}): researched ${servicesResearched} services → +${keywordsAdded} kw, +${clustersAdded} clusters; queued ${autoApprove.result?.jobsCreated ?? 0} jobs; processed ${queue.processed} (image: ${imageMode})`,
  });

  return {
    ok: true,
    servicesResearched,
    keywordsAdded,
    clustersAdded,
    autoApprove,
    queueProcessed: queue.processed,
    frequency: settings.automationFrequency,
    imageMode,
  };
}

export type StartAutomationInput = {
  frequency: "daily" | "weekly" | "monthly";
  postsPerDay: number;
  keywordsPerService: number;
  serviceMode: "all" | "selected";
  serviceSlugs: string[];
  imageMode: "stock" | "openai";
};

export async function startScheduledAutomation(
  input: StartAutomationInput,
  actorId: string,
): Promise<{ settings: SeoBlogCenterSettings; run: ScheduledAutomationResult }> {
  const postsPerDay = clampDailyBlogLimit(input.postsPerDay, 5);
  const keywordsPerService = Math.min(250, Math.max(10, input.keywordsPerService));
  const imageMode = input.imageMode === "openai" ? "openai" : "stock";

  const settings = await updateSeoBlogSettings({
    automationScheduleEnabled: true,
    automationFrequency: input.frequency,
    automationPostsPerDay: postsPerDay,
    automationKeywordsPerService: keywordsPerService,
    automationServiceMode: input.serviceMode,
    automationServiceSlugs:
      input.serviceMode === "selected" ? input.serviceSlugs : [],
    automationImageMode: imageMode,
    automationStartedAt: new Date().toISOString(),
    automationStartedBy: actorId,
    maxBlogsGeneratedPerDay: postsPerDay,
    maxBlogsPublishedPerDay: postsPerDay,
    maxImagesPerDay: imageMode === "openai" ? postsPerDay : 0,
    autoPublish: true,
    pauseGenerationQueue: false,
    generateImages: imageMode === "openai",
    autoApprovePublishWithAiImage: imageMode === "openai",
    autoApprovePublishWithoutImage: imageMode === "stock",
    enabled: true,
  });

  await addSeoBlogLog({
    type: "pipeline_run",
    message: `Automation started: ${input.frequency}, ${postsPerDay} posts/day, ${keywordsPerService} kw/service, image=${imageMode}, services=${input.serviceMode}`,
  });

  const run = await runScheduledAutomation({ actorId, force: true });

  return { settings, run };
}

export async function stopScheduledAutomation(): Promise<SeoBlogCenterSettings> {
  const settings = await updateSeoBlogSettings({
    automationScheduleEnabled: false,
    autoApprovePublishWithAiImage: false,
    autoApprovePublishWithoutImage: false,
  });
  await addSeoBlogLog({
    type: "pipeline_run",
    message: "Scheduled SEO automation stopped by admin",
  });
  return settings;
}
