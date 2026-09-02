import { querySearchAnalytics } from "./gsc-client";

export type GscTodayImpressions = {
  ok: boolean;
  date: string;
  impressions: number;
  clicks: number;
  error?: string;
  note?: string;
  isLatestAvailable?: boolean;
};

function istYmd(daysOffset = 0): string {
  const d = new Date();
  if (daysOffset) d.setDate(d.getDate() - daysOffset);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

async function totalsForDate(ymd: string) {
  const result = await querySearchAnalytics({
    startDate: ymd,
    endDate: ymd,
    rowLimit: 1,
  });
  if (!result.ok) return { ok: false as const, error: result.error };
  const row = result.rows[0];
  return {
    ok: true as const,
    impressions: row?.impressions ?? 0,
    clicks: row?.clicks ?? 0,
  };
}

/** Total site impressions from Google Search Console for IST today (or latest day with data). */
export async function getGscTodayImpressions(): Promise<GscTodayImpressions> {
  const today = istYmd(0);

  const todayResult = await totalsForDate(today);
  if (!todayResult.ok) {
    return {
      ok: false,
      date: today,
      impressions: 0,
      clicks: 0,
      error: todayResult.error,
    };
  }

  if (todayResult.impressions > 0 || todayResult.clicks > 0) {
    return {
      ok: true,
      date: today,
      impressions: todayResult.impressions,
      clicks: todayResult.clicks,
    };
  }

  // GSC often lags 2–3 days — show the most recent day with data.
  for (const offset of [1, 2, 3]) {
    const ymd = istYmd(offset);
    const past = await totalsForDate(ymd);
    if (!past.ok) continue;
    if (past.impressions > 0 || past.clicks > 0) {
      return {
        ok: true,
        date: ymd,
        impressions: past.impressions,
        clicks: past.clicks,
        isLatestAvailable: true,
        note: `GSC lags ~2–3 days. Showing latest available day (${ymd}), not today (${today}).`,
      };
    }
  }

  return {
    ok: true,
    date: today,
    impressions: 0,
    clicks: 0,
    note:
      "No impressions in the last 4 days yet — GSC may still be processing, or connect Search Console in GSC Agent.",
  };
}
