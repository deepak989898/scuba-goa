import { querySearchAnalytics } from "./gsc-client";

export type GscTodayImpressions = {
  ok: boolean;
  date: string;
  impressions: number;
  clicks: number;
  error?: string;
  note?: string;
};

function istYmd(daysOffset = 0): string {
  const d = new Date();
  if (daysOffset) d.setDate(d.getDate() - daysOffset);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/** Total site impressions from Google Search Console for IST today. */
export async function getGscTodayImpressions(): Promise<GscTodayImpressions> {
  const today = istYmd(0);

  const result = await querySearchAnalytics({
    startDate: today,
    endDate: today,
    rowLimit: 1,
  });

  if (!result.ok) {
    return {
      ok: false,
      date: today,
      impressions: 0,
      clicks: 0,
      error: result.error,
    };
  }

  const row = result.rows[0];
  const impressions = row?.impressions ?? 0;
  const clicks = row?.clicks ?? 0;

  return {
    ok: true,
    date: today,
    impressions,
    clicks,
    note:
      impressions === 0
        ? "GSC often lags 2–3 days — zero can mean today’s data is not in Search Console yet."
        : undefined,
  };
}
