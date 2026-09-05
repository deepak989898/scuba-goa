import { inspectUrlInGsc, type UrlInspectionResult } from "./gsc-client";
import { GSC_INSPECT_QUEUE_BATCH, getSeoSettings, saveSeoSettings } from "./settings";
import {
  getSeoUrl,
  listSeoUrls,
  logAction,
  upsertSeoUrl,
} from "./store";
import type { SeoUrlRecord } from "./types";

function todayIst(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

async function reserveInspectionSlot(): Promise<boolean> {
  const granted = await reserveInspectionSlots(1);
  return granted > 0;
}

/** Reserve up to `max` inspection slots in one settings write (faster than per-URL). */
async function reserveInspectionSlots(max: number): Promise<number> {
  const settings = await getSeoSettings();
  if (settings.paused) return 0;
  const day = todayIst();
  let used = settings.inspectionsUsedToday;
  if (settings.inspectionsQuotaDate !== day) used = 0;
  const remaining = Math.max(0, settings.inspectionDailyQuota - used);
  const granted = Math.min(Math.max(0, max), remaining);
  if (granted > 0) {
    await saveSeoSettings({
      inspectionsUsedToday: used + granted,
      inspectionsQuotaDate: day,
    });
  }
  return granted;
}

function inspectionSortScore(u: SeoUrlRecord): number {
  if (u.indexStatus === "PENDING_INSPECTION") return 0;
  if (!u.lastInspectionAt) return 1;
  if (u.indexStatus === "UNKNOWN" || u.indexStatus === "API_ERROR") return 2;
  return 10 + u.inspectionPriority;
}

async function applyInspectionResult(
  url: SeoUrlRecord,
  r: UrlInspectionResult,
  inspectedAt: string,
): Promise<void> {
  const rankingStatus =
    r.indexStatus === "INDEXED" &&
    (url.rankingStatus === "NEW_NO_DATA" ||
      (url.impressions === 0 && url.clicks === 0))
      ? "INDEXED_NO_IMPRESSIONS"
      : url.rankingStatus;

  await upsertSeoUrl({
    ...url,
    indexStatus: r.indexStatus,
    coverageState: r.coverageState,
    crawlState: r.crawlState,
    googleCanonical: r.googleCanonical,
    userCanonical: r.userCanonical || url.userCanonical,
    lastCrawlTime: r.lastCrawlTime,
    robotsBlocked: (r.robotsTxtState || "").toUpperCase().includes("DISALLOWED"),
    lastInspectionAt: inspectedAt,
    nextInspectionAt: new Date(Date.now() + 7 * 24 * 3600_000).toISOString(),
    inspectionPriority: r.indexStatus === "INDEXED" ? 3 : 1,
    rankingStatus,
    updatedAt: inspectedAt,
    lastActionAt: inspectedAt,
    retryCount: 0,
  });
}

export async function enqueueInspection(
  record: SeoUrlRecord,
  priority = 1,
  delayMinutes = 60,
): Promise<void> {
  const next = new Date(Date.now() + delayMinutes * 60_000).toISOString();
  await upsertSeoUrl({
    ...record,
    inspectionPriority: Math.min(record.inspectionPriority, priority),
    nextInspectionAt: next,
    indexStatus:
      record.indexStatus === "INDEXED"
        ? record.indexStatus
        : "PENDING_INSPECTION",
    updatedAt: new Date().toISOString(),
  });
}

/** Inspect one inventory URL immediately (uses daily quota). */
export async function refreshSeoUrlInspection(
  urlId: string,
  opts?: { skipQuotaReserve?: boolean },
): Promise<{ ok: boolean; indexStatus?: string; error?: string }> {
  const url = await getSeoUrl(urlId);
  if (!url) return { ok: false, error: "URL not found" };

  if (!opts?.skipQuotaReserve) {
    const slot = await reserveInspectionSlot();
    if (!slot) {
      return { ok: false, error: "Daily inspection quota used — try tomorrow" };
    }
  }

  const result = await inspectUrlInGsc(url.url);
  const inspectedAt = new Date().toISOString();

  if (!result.ok) {
    await upsertSeoUrl({
      ...url,
      indexStatus: "API_ERROR",
      lastInspectionAt: inspectedAt,
      nextInspectionAt: new Date(Date.now() + 24 * 3600_000).toISOString(),
      retryCount: url.retryCount + 1,
      updatedAt: inspectedAt,
      lastActionAt: inspectedAt,
    });
    return { ok: false, error: result.error };
  }

  await applyInspectionResult(url, result.result, inspectedAt);
  await logAction({
    urlId: url.id,
    url: url.url,
    action: "manual_url_inspection",
    detail: `Status ${result.result.indexStatus}`,
    ok: true,
  });
  return { ok: true, indexStatus: result.result.indexStatus };
}

/** Inspect multiple URLs (sequential, quota-limited). */
export async function refreshSeoUrlInspectionBulk(
  urlIds: string[],
  max = 20,
): Promise<{
  processed: number;
  skippedQuota: number;
  results: Array<{
    urlId: string;
    ok: boolean;
    indexStatus?: string;
    error?: string;
  }>;
}> {
  const unique = [...new Set(urlIds.map((id) => id.trim()).filter(Boolean))].slice(
    0,
    max,
  );
  const results: Array<{
    urlId: string;
    ok: boolean;
    indexStatus?: string;
    error?: string;
  }> = [];
  let processed = 0;
  let skippedQuota = 0;

  const slots = await reserveInspectionSlots(unique.length);
  if (slots === 0) {
    return { processed: 0, skippedQuota: unique.length, results: [] };
  }

  for (const urlId of unique.slice(0, slots)) {
    const r = await refreshSeoUrlInspection(urlId, { skipQuotaReserve: true });
    results.push({
      urlId,
      ok: r.ok,
      indexStatus: r.indexStatus,
      error: r.error,
    });
    if (r.ok) processed += 1;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  skippedQuota = unique.length - results.length;

  return { processed, skippedQuota, results };
}

/** Process due URL Inspection jobs within quota (read status only). */
export async function processInspectionQueue(
  max = GSC_INSPECT_QUEUE_BATCH,
): Promise<{
  processed: number;
  skippedQuota: number;
  errors: number;
}> {
  const settings = await getSeoSettings();
  if (settings.paused) {
    return { processed: 0, skippedQuota: 0, errors: 0 };
  }

  const batchMax = Math.min(
    GSC_INSPECT_QUEUE_BATCH,
    Math.max(1, max),
    settings.inspectionDailyQuota,
  );
  const slots = await reserveInspectionSlots(batchMax);
  if (slots === 0) {
    return { processed: 0, skippedQuota: batchMax, errors: 0 };
  }

  const urls = await listSeoUrls({ limit: 800 });
  const now = Date.now();
  const due = urls
    .filter(
      (u) =>
        u.eligibleForIndexing &&
        u.status === "active" &&
        (!u.nextInspectionAt || new Date(u.nextInspectionAt).getTime() <= now),
    )
    .sort((a, b) => inspectionSortScore(a) - inspectionSortScore(b))
    .slice(0, slots);

  let processed = 0;
  let skippedQuota = batchMax - slots;
  let errors = 0;

  for (const url of due) {
    const result = await inspectUrlInGsc(url.url);
    const inspectedAt = new Date().toISOString();

    if (!result.ok) {
      errors += 1;
      await upsertSeoUrl({
        ...url,
        indexStatus: "API_ERROR",
        lastInspectionAt: inspectedAt,
        nextInspectionAt: new Date(Date.now() + 24 * 3600_000).toISOString(),
        retryCount: url.retryCount + 1,
        updatedAt: inspectedAt,
        lastActionAt: inspectedAt,
      });
      await logAction({
        urlId: url.id,
        url: url.url,
        action: "url_inspection",
        detail: result.error,
        ok: false,
      });
      continue;
    }

    const r = result.result;
    await applyInspectionResult(url, r, inspectedAt);

    await logAction({
      urlId: url.id,
      url: url.url,
      action: "url_inspection",
      detail: `Status ${r.indexStatus} (read-only inspection; not a request-to-index)`,
      ok: true,
    });
    processed += 1;

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return { processed, skippedQuota, errors };
}
