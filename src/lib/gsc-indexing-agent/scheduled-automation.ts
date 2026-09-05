import { syncSearchAnalytics } from "./analytics-sync";
import { processInspectionQueue } from "./inspect-queue";
import {
  generateAndApplyRankingImprove,
} from "./ranking-improve";
import { applyStockImageForRankingBlog } from "./ranking-stock-image";
import { hasRecentRankingContentImprove } from "./ranking-opportunity-ui";
import { getSeoSettings, saveSeoSettings, GSC_INSPECT_QUEUE_BATCH } from "./settings";
import { listSeoUrls, logAction } from "./store";
import type {
  GscAutomationOpenAiImageItem,
  SeoSettings,
  SeoUrlRecord,
} from "./types";

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

export function shouldRunGscScheduledAutomation(
  settings: SeoSettings,
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

/** Blogs/guides with position worse than threshold and meaningful impressions. */
export function isAutomationRankingCandidate(
  u: SeoUrlRecord,
  positionThreshold: number,
): boolean {
  if (u.pageType !== "blog" && u.pageType !== "guide") return false;
  if (hasRecentRankingContentImprove(u)) return false;

  const pos = Number(u.averagePosition) || 0;
  const impressions = Number(u.impressions) || 0;
  if (pos <= 0 || impressions < 3) return false;

  if (pos > positionThreshold) return true;

  if (
    pos > positionThreshold - 2 &&
    [
      "POSITION_11_TO_20",
      "LOW_CTR",
      "IMPRESSIONS_NO_CLICKS",
      "POSITION_4_TO_10",
    ].includes(u.rankingStatus)
  ) {
    return true;
  }

  return false;
}

export function listAutomationRankingCandidates(
  urls: SeoUrlRecord[],
  positionThreshold: number,
  max: number,
): SeoUrlRecord[] {
  return urls
    .filter((u) => isAutomationRankingCandidate(u, positionThreshold))
    .sort((a, b) => {
      const posDiff =
        (Number(b.averagePosition) || 0) - (Number(a.averagePosition) || 0);
      if (posDiff !== 0) return posDiff;
      return (Number(b.impressions) || 0) - (Number(a.impressions) || 0);
    })
    .slice(0, max);
}

function mergeOpenAiQueue(
  current: GscAutomationOpenAiImageItem[],
  items: GscAutomationOpenAiImageItem[],
): GscAutomationOpenAiImageItem[] {
  const map = new Map<string, GscAutomationOpenAiImageItem>();
  for (const item of current) map.set(item.urlId, item);
  for (const item of items) map.set(item.urlId, item);
  return [...map.values()]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 50);
}

export type GscScheduledAutomationResult = {
  ok: boolean;
  skipped?: boolean;
  skipReason?: string;
  analytics?: Record<string, unknown>;
  inspect?: Record<string, unknown>;
  rankingCandidates?: number;
  rankingImproved?: number;
  rankingFailed?: number;
  stockImagesOk?: number;
  openAiImageAttention?: number;
  frequency?: string;
  positionThreshold?: number;
};

export async function runGscScheduledAutomation(opts?: {
  actorId?: string;
  force?: boolean;
}): Promise<GscScheduledAutomationResult> {
  const settings = await getSeoSettings();

  if (!shouldRunGscScheduledAutomation(settings, { force: opts?.force })) {
    return {
      ok: true,
      skipped: true,
      skipReason: settings.automationScheduleEnabled
        ? "Not due yet for this frequency"
        : "GSC automation is off",
    };
  }

  const positionThreshold = Math.min(
    20,
    Math.max(5, settings.automationPositionThreshold ?? 10),
  );
  const inspectPerRun = Math.min(
    20,
    Math.max(1, settings.automationInspectPerRun ?? GSC_INSPECT_QUEUE_BATCH),
  );
  const improveMax = Math.min(
    12,
    Math.max(1, settings.automationRankingImproveMax ?? 5),
  );

  const analytics = await syncSearchAnalytics();
  const inspect = await processInspectionQueue(inspectPerRun);

  const urls = await listSeoUrls({ limit: 2000 });
  const candidates = listAutomationRankingCandidates(
    urls,
    positionThreshold,
    improveMax,
  );

  let rankingImproved = 0;
  let rankingFailed = 0;
  let stockImagesOk = 0;
  const openAiAttention: GscAutomationOpenAiImageItem[] = [];

  for (const record of candidates) {
    try {
      const { page } = await generateAndApplyRankingImprove(record.id);

      if (record.pageType === "blog") {
        const stock = await applyStockImageForRankingBlog(
          record,
          page.fields.title || page.blogPost?.title || "",
        );
        if (stock.ok) {
          stockImagesOk += 1;
        } else {
          openAiAttention.push({
            urlId: record.id,
            url: record.url,
            title: page.fields.title || page.blogPost?.title || record.contentId,
            slug: record.contentId,
            reason: stock.reason || "Stock image failed",
            at: new Date().toISOString(),
          });
        }
      }

      rankingImproved += 1;
    } catch (e) {
      rankingFailed += 1;
      openAiAttention.push({
        urlId: record.id,
        url: record.url,
        title: record.contentId,
        slug: record.contentId,
        reason:
          e instanceof Error ? e.message : "Ranking improve failed",
        at: new Date().toISOString(),
      });
    }
  }

  const urlsWithImageFlag = urls.filter(
    (u) => u.imageAttention?.needsOpenAi,
  );
  for (const u of urlsWithImageFlag) {
    if (openAiAttention.some((x) => x.urlId === u.id)) continue;
    openAiAttention.push({
      urlId: u.id,
      url: u.url,
      title: u.contentId,
      slug: u.contentId,
      reason: u.imageAttention?.reason || "Needs OpenAI image review",
      at: u.imageAttention?.at || new Date().toISOString(),
    });
  }

  const mergedQueue = mergeOpenAiQueue(
    settings.automationOpenAiImageQueue ?? [],
    openAiAttention,
  );

  const now = new Date().toISOString();
  await saveSeoSettings({
    lastAnalyticsSyncAt: now,
    automationLastRunAt: now,
    automationLastRunDate: todayIst(),
    automationOpenAiImageQueue: mergedQueue,
  });

  await logAction({
    action: "gsc_scheduled_automation",
    detail: `analytics ok; inspect ${JSON.stringify(inspect).slice(0, 80)}; improved ${rankingImproved}/${candidates.length}; stock ok ${stockImagesOk}; openai attention ${mergedQueue.length}`,
    ok: rankingFailed === 0,
  });

  return {
    ok: true,
    analytics,
    inspect,
    rankingCandidates: candidates.length,
    rankingImproved,
    rankingFailed,
    stockImagesOk,
    openAiImageAttention: mergedQueue.length,
    frequency: settings.automationFrequency || "daily",
    positionThreshold,
  };
}

export type StartGscAutomationInput = {
  frequency: "daily" | "weekly" | "monthly";
  positionThreshold: number;
  inspectPerRun: number;
  rankingImproveMax: number;
};

export async function startGscScheduledAutomation(
  input: StartGscAutomationInput,
  actorId: string,
): Promise<{ settings: SeoSettings; run: GscScheduledAutomationResult }> {
  const settings = await saveSeoSettings({
    automationScheduleEnabled: true,
    automationFrequency: input.frequency,
    automationPositionThreshold: Math.min(
      20,
      Math.max(5, input.positionThreshold),
    ),
    automationInspectPerRun: Math.min(20, Math.max(1, input.inspectPerRun)),
    automationRankingImproveMax: Math.min(12, Math.max(1, input.rankingImproveMax)),
    automationStartedAt: new Date().toISOString(),
    automationStartedBy: actorId,
  });

  await logAction({
    action: "gsc_automation_started",
    detail: `freq=${input.frequency} pos>${input.positionThreshold} inspect=${input.inspectPerRun} improve=${input.rankingImproveMax} stock-only images`,
    ok: true,
  });

  const run = await runGscScheduledAutomation({ actorId, force: true });
  return { settings, run };
}

export async function stopGscScheduledAutomation(): Promise<SeoSettings> {
  const settings = await saveSeoSettings({
    automationScheduleEnabled: false,
  });
  await logAction({
    action: "gsc_automation_stopped",
    detail: "GSC scheduled automation disabled",
    ok: true,
  });
  return settings;
}
