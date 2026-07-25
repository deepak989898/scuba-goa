import { querySearchAnalytics } from "./gsc-client";
import { listSeoUrls, logAction, upsertSeoUrl } from "./store";
import { saveSeoSettings } from "./settings";
import { normalizeSiteUrl, urlIdFromNormalized } from "./normalize-url";
import type { RankingStatus, SeoUrlRecord } from "./types";
import { getAdminDb } from "@/lib/firebase-admin";
import { stripUndefinedDeep } from "@/lib/firestore-json";
import { SEO_ANALYTICS_DAILY } from "./store";

function istDateOffset(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function rankingFromMetrics(input: {
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
  indexedDaysHint?: boolean;
}): RankingStatus {
  const { impressions, clicks, ctr, position } = input;
  if (impressions === 0 && clicks === 0) return "INDEXED_NO_IMPRESSIONS";
  if (impressions >= 50 && clicks === 0) return "IMPRESSIONS_NO_CLICKS";
  if (impressions >= 100 && ctr < 0.02) return "LOW_CTR";
  if (position > 0 && position <= 3) return "POSITION_1_TO_3";
  if (position > 3 && position <= 10) return "POSITION_4_TO_10";
  if (position > 10 && position <= 20) return "POSITION_11_TO_20";
  if (position > 20) return "POSITION_21_PLUS";
  return "HEALTHY";
}

/** Sync last-28-day page metrics from Search Analytics into seoUrls. */
export async function syncSearchAnalytics(): Promise<{
  pagesUpdated: number;
  error?: string;
}> {
  // GSC data lag ~2 days — end at yesterday-1
  const endDate = istDateOffset(2);
  const startDate = istDateOffset(30);

  const result = await querySearchAnalytics({
    startDate,
    endDate,
    dimensions: ["page"],
    rowLimit: 2000,
  });

  if (!result.ok) {
    await logAction({
      action: "analytics_sync",
      detail: result.error,
      ok: false,
    });
    return { pagesUpdated: 0, error: result.error };
  }

  const urls = await listSeoUrls({ limit: 2000 });
  const byNorm = new Map(urls.map((u) => [u.normalizedUrl, u]));
  let pagesUpdated = 0;
  const now = new Date().toISOString();

  for (const row of result.rows) {
    const page = row.keys[0];
    if (!page) continue;
    const norm = normalizeSiteUrl(page);
    if (!norm) continue;
    const existing = byNorm.get(norm);
    const base: SeoUrlRecord | undefined = existing;
    if (!base) continue;

    const rankingStatus = rankingFromMetrics({
      impressions: row.impressions,
      clicks: row.clicks,
      ctr: row.ctr,
      position: row.position,
    });

    await upsertSeoUrl({
      ...base,
      impressions: row.impressions,
      clicks: row.clicks,
      ctr: row.ctr,
      averagePosition: row.position,
      rankingStatus,
      updatedAt: now,
      lastActionAt: now,
    });
    pagesUpdated += 1;
  }

  // Query-level snapshot (top queries) for admin
  const q = await querySearchAnalytics({
    startDate,
    endDate,
    dimensions: ["query"],
    rowLimit: 200,
  });
  const db = getAdminDb();
  if (db && q.ok) {
    await db.collection(SEO_ANALYTICS_DAILY).doc(endDate).set(
      stripUndefinedDeep({
        id: endDate,
        startDate,
        endDate,
        pagesUpdated,
        topQueries: q.rows.slice(0, 100),
        createdAt: now,
      }),
      { merge: true },
    );
  }

  await saveSeoSettings({ lastAnalyticsSyncAt: now });
  await logAction({
    action: "analytics_sync",
    detail: `Updated ${pagesUpdated} pages (${startDate}→${endDate})`,
    ok: true,
  });

  return { pagesUpdated };
}

export { urlIdFromNormalized };
