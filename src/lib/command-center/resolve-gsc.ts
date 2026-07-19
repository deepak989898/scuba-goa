import { getAdminDb } from "@/lib/firebase-admin";
import { istDateString, istYesterdayString } from "@/lib/ai-analytics/ist";

export type ResolvedGscSnapshot = {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  /** IST date the metrics belong to (or weekly end date). */
  asOfDate: string;
  source: "aiAnalyticsDaily" | "seoWeekly" | "none";
  /** Human note for the admin UI when GSC is missing or lagged. */
  note: string;
};

function hasUsefulGsc(row: {
  clicks?: number;
  impressions?: number;
  position?: number;
}): boolean {
  return (
    Number(row.impressions ?? 0) > 0 ||
    Number(row.clicks ?? 0) > 0 ||
    Number(row.position ?? 0) > 0
  );
}

function daysBackIst(fromIst: string, days: number): string[] {
  const out: string[] = [];
  const base = new Date(`${fromIst}T12:00:00+05:30`);
  for (let i = 0; i < days; i++) {
    const d = new Date(base.getTime() - i * 86400000);
    out.push(istDateString(d));
  }
  return out;
}

function weightedFromWeekly(doc: Record<string, unknown>): {
  clicks: number;
  impressions: number;
  position: number;
  ctr: number;
} | null {
  const queries = (doc.topQueries ?? []) as {
    clicks?: number;
    impressions?: number;
    position?: number;
  }[];
  const pages = (doc.topPages ?? []) as {
    clicks?: number;
    impressions?: number;
    position?: number;
  }[];
  const rows = queries.length ? queries : pages;
  if (!rows.length) return null;

  let clicks = 0;
  let impressions = 0;
  let positionSum = 0;
  for (const r of rows) {
    const c = Number(r.clicks ?? 0);
    const imp = Number(r.impressions ?? 0);
    const pos = Number(r.position ?? 0);
    clicks += c;
    impressions += imp;
    positionSum += pos * (imp > 0 ? imp : 0);
  }
  if (impressions <= 0 && clicks <= 0) return null;
  return {
    clicks,
    impressions,
    position: impressions > 0 ? positionSum / impressions : 0,
    ctr: impressions > 0 ? clicks / impressions : 0,
  };
}

/**
 * Command Center SEO cards must not rely only on "yesterday" GSC.
 * Search Console often has a 2–3 day lag, so yesterday is frequently all zeros.
 * We walk recent aiAnalyticsDaily docs, then fall back to seoWeekly aggregates.
 */
export async function resolveGscForCommandCenter(
  preferredDateIst?: string,
): Promise<ResolvedGscSnapshot> {
  const db = getAdminDb();
  const anchor = preferredDateIst?.trim() || istYesterdayString();

  if (!db) {
    return {
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0,
      asOfDate: anchor,
      source: "none",
      note: "Firebase Admin not configured",
    };
  }

  const dates = daysBackIst(anchor, 10);
  for (const dateIst of dates) {
    const snap = await db.collection("aiAnalyticsDaily").doc(dateIst).get();
    if (!snap.exists) continue;
    const data = snap.data() as Record<string, unknown>;
    const gsc = data.searchConsole as Record<string, unknown> | null | undefined;
    const status = (data.connectorsStatus as { searchConsole?: string } | undefined)
      ?.searchConsole;
    if (!gsc || typeof gsc !== "object") {
      if (status === "error" && dateIst === dates[0]) {
        // Keep scanning older days; remember we saw an error on preferred day.
        continue;
      }
      continue;
    }
    const clicks = Number(gsc.clicks ?? 0);
    const impressions = Number(gsc.impressions ?? 0);
    const position = Number(gsc.position ?? 0);
    const ctr = Number(gsc.ctr ?? 0);
    if (!hasUsefulGsc({ clicks, impressions, position })) continue;

    const lagNote =
      dateIst !== anchor
        ? `GSC lags — showing ${dateIst} (yesterday ${anchor} had no usable data).`
        : "From Search Console daily snapshot.";

    return {
      clicks,
      impressions,
      ctr,
      position,
      asOfDate: dateIst,
      source: "aiAnalyticsDaily",
      note: lagNote,
    };
  }

  const weeklySnap = await db.collection("seoWeekly").get();
  const weeklyLatest = [...weeklySnap.docs].sort((a, b) => b.id.localeCompare(a.id))[0];
  if (weeklyLatest) {
    const agg = weightedFromWeekly(weeklyLatest.data() as Record<string, unknown>);
    if (agg) {
      return {
        ...agg,
        asOfDate: weeklyLatest.id,
        source: "seoWeekly",
        note: `From SEO weekly snapshot (${weeklyLatest.id}) — daily GSC empty for last ${dates.length} days.`,
      };
    }
  }

  const preferred = await db.collection("aiAnalyticsDaily").doc(anchor).get();
  const preferredData = preferred.exists
    ? (preferred.data() as Record<string, unknown>)
    : null;
  const connectorMsg = (
    preferredData?.connectorsStatus as { searchConsoleMessage?: string } | undefined
  )?.searchConsoleMessage;

  return {
    clicks: 0,
    impressions: 0,
    ctr: 0,
    position: 0,
    asOfDate: anchor,
    source: "none",
    note:
      connectorMsg?.trim() ||
      "No Search Console metrics found. Confirm GOOGLE_SEARCH_CONSOLE_SITE_URL, service account access in GSC, and that the AI analytics daily cron has run.",
  };
}
