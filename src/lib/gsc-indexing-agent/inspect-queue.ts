import { getAdminDb } from "@/lib/firebase-admin";
import { stripUndefinedDeep } from "@/lib/firestore-json";
import { inspectUrlInGsc } from "./gsc-client";
import { getSeoSettings, saveSeoSettings } from "./settings";
import { listSeoUrls, logAction, upsertSeoUrl, SEO_INSPECTIONS } from "./store";
import type { SeoUrlRecord } from "./types";

function todayIst(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

async function reserveInspectionSlot(): Promise<boolean> {
  const settings = await getSeoSettings();
  if (settings.paused) return false;
  const day = todayIst();
  let used = settings.inspectionsUsedToday;
  if (settings.inspectionsQuotaDate !== day) used = 0;
  if (used >= settings.inspectionDailyQuota) return false;
  await saveSeoSettings({
    inspectionsUsedToday: used + 1,
    inspectionsQuotaDate: day,
  });
  return true;
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

/** Process due URL Inspection jobs within quota (read status only). */
export async function processInspectionQueue(max = 10): Promise<{
  processed: number;
  skippedQuota: number;
  errors: number;
}> {
  const settings = await getSeoSettings();
  if (settings.paused) {
    return { processed: 0, skippedQuota: 0, errors: 0 };
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
    .sort((a, b) => a.inspectionPriority - b.inspectionPriority)
    .slice(0, max);

  let processed = 0;
  let skippedQuota = 0;
  let errors = 0;

  for (const url of due) {
    const ok = await reserveInspectionSlot();
    if (!ok) {
      skippedQuota += 1;
      break;
    }

    const result = await inspectUrlInGsc(url.url);
    const inspectedAt = new Date().toISOString();
    const db = getAdminDb();

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
      updatedAt: inspectedAt,
      lastActionAt: inspectedAt,
      retryCount: 0,
    });

    if (db) {
      await db.collection(SEO_INSPECTIONS).doc(`${url.id}_${Date.now()}`).set(
        stripUndefinedDeep({
          urlId: url.id,
          url: url.url,
          result: r,
          createdAt: inspectedAt,
          siteId: url.siteId,
        }),
      );
    }

    await logAction({
      urlId: url.id,
      url: url.url,
      action: "url_inspection",
      detail: `Status ${r.indexStatus} (read-only inspection; not a request-to-index)`,
      ok: true,
    });
    processed += 1;

    // Light delay between calls
    await new Promise((r) => setTimeout(r, 400));
  }

  return { processed, skippedQuota, errors };
}
