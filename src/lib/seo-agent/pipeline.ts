import { getAdminDb } from "@/lib/firebase-admin";
import { istYesterdayString } from "@/lib/ai-analytics/ist";
import { stripUndefinedDeep } from "@/lib/firestore-json";
import { periodEnding, previousPeriod } from "@/lib/seo-agent/date-range";
import { fetchGscRows } from "@/lib/seo-agent/search-console-period";
import type {
  SeoPageAudit,
  SeoPageRow,
  SeoQueryRow,
  SeoWeeklyDoc,
  SeoWeeklyReportDoc,
} from "@/lib/seo-agent/types";
import { auditPage } from "@/lib/seo-agent/page-audit";
import { detectSeoIssues } from "@/lib/seo-agent/detect";
import { generateSeoWeeklyReport } from "@/lib/seo-agent/openai-weekly";
import { detectCompetitorGaps } from "@/lib/seo-agent/competitors";
import { addTopicToQueue } from "@/lib/blog-automation/topics";

function trend(cur: { clicks: number; impressions: number; ctr: number; position: number }, prev: {
  clicks: number; impressions: number; ctr: number; position: number
}) {
  return {
    clicks: cur.clicks,
    impressions: cur.impressions,
    ctr: cur.ctr,
    position: cur.position,
    clicksPrev: prev.clicks,
    impressionsPrev: prev.impressions,
    ctrPrev: prev.ctr,
    positionPrev: prev.position,
    clicksDelta: cur.clicks - prev.clicks,
    impressionsDelta: cur.impressions - prev.impressions,
    ctrDelta: cur.ctr - prev.ctr,
    positionDelta: cur.position - prev.position,
  };
}

function normalizePathFromPageKey(siteUrl: string, pageKey: string): string {
  if (!pageKey) return "/";
  if (pageKey.startsWith("http://") || pageKey.startsWith("https://")) {
    try {
      return new URL(pageKey).pathname || "/";
    } catch {
      return "/";
    }
  }
  const base = siteUrl.replace(/\/$/, "");
  try {
    return new URL(`${base}${pageKey.startsWith("/") ? "" : "/"}${pageKey}`).pathname || "/";
  } catch {
    return "/";
  }
}

export async function runSeoWeeklyPipeline(opts?: {
  weekId?: string; // default yesterday IST
  days?: number; // default 7
  queueBlogTopics?: boolean; // default false
}): Promise<{ ok: boolean; weekId: string; error?: string }> {
  const db = getAdminDb();
  if (!db) return { ok: false, weekId: "", error: "Firebase Admin not configured" };

  const weekId = opts?.weekId?.trim() || istYesterdayString();
  const days = Math.min(14, Math.max(7, Math.floor(opts?.days ?? 7)));

  try {
    const range = periodEnding(weekId, days);
    const prev = previousPeriod(range.start, range.end);

    // Pull GSC: by page, by query, and page+query for attribution.
    const [pagesCur, pagesPrev, queriesCur, queriesPrev, pqCur] = await Promise.all([
      fetchGscRows({ startDate: range.start, endDate: range.end, dimensions: ["page"], rowLimit: 200 }),
      fetchGscRows({ startDate: prev.start, endDate: prev.end, dimensions: ["page"], rowLimit: 200 }),
      fetchGscRows({ startDate: range.start, endDate: range.end, dimensions: ["query"], rowLimit: 250 }),
      fetchGscRows({ startDate: prev.start, endDate: prev.end, dimensions: ["query"], rowLimit: 250 }),
      fetchGscRows({ startDate: range.start, endDate: range.end, dimensions: ["page", "query"], rowLimit: 800 }),
    ]);

    const okAll =
      pagesCur.ok &&
      pagesPrev.ok &&
      queriesCur.ok &&
      queriesPrev.ok &&
      pqCur.ok;
    if (!okAll) {
      const msg =
        (!pagesCur.ok && pagesCur.error) ||
        (!pagesPrev.ok && pagesPrev.error) ||
        (!queriesCur.ok && queriesCur.error) ||
        (!queriesPrev.ok && queriesPrev.error) ||
        (!pqCur.ok && pqCur.error) ||
        "Search Console fetch failed";
      return { ok: false, weekId, error: msg };
    }

    const siteUrl = pagesCur.siteUrl;

    // Index prev for deltas.
    const prevByPage = new Map(
      pagesPrev.rows.map((r) => [r.keys[0] ?? "", r]),
    );
    const prevByQuery = new Map(
      queriesPrev.rows.map((r) => [r.keys[0] ?? "", r]),
    );

    // page+query attribution: map page -> top queries
    const topQueriesByPage = new Map<
      string,
      { query: string; clicks: number; impressions: number; position: number; ctr: number }[]
    >();
    for (const r of pqCur.rows) {
      const page = r.keys[0] ?? "";
      const query = r.keys[1] ?? "";
      if (!page || !query) continue;
      const arr = topQueriesByPage.get(page) ?? [];
      arr.push({
        query,
        clicks: r.clicks,
        impressions: r.impressions,
        position: r.position,
        ctr: r.ctr,
      });
      topQueriesByPage.set(page, arr);
    }
    for (const [page, arr] of topQueriesByPage) {
      arr.sort((a, b) => b.impressions - a.impressions || b.clicks - a.clicks);
      topQueriesByPage.set(page, arr.slice(0, 6));
    }

    const topPages: SeoPageRow[] = pagesCur.rows
      .sort((a, b) => b.impressions - a.impressions || b.clicks - a.clicks)
      .slice(0, 40)
      .map((r) => {
        const page = r.keys[0] ?? "";
        const prevRow = prevByPage.get(page);
        const prevAgg = prevRow
          ? { clicks: prevRow.clicks, impressions: prevRow.impressions, ctr: prevRow.ctr, position: prevRow.position }
          : { clicks: 0, impressions: 0, ctr: 0, position: 0 };
        return {
          page,
          ...trend(
            { clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position },
            prevAgg,
          ),
          topQueries: topQueriesByPage.get(page) ?? [],
        };
      });

    // query -> top pages attribution
    const topPagesByQuery = new Map<
      string,
      { page: string; clicks: number; impressions: number; position: number; ctr: number }[]
    >();
    for (const r of pqCur.rows) {
      const page = r.keys[0] ?? "";
      const query = r.keys[1] ?? "";
      if (!page || !query) continue;
      const arr = topPagesByQuery.get(query) ?? [];
      arr.push({
        page,
        clicks: r.clicks,
        impressions: r.impressions,
        position: r.position,
        ctr: r.ctr,
      });
      topPagesByQuery.set(query, arr);
    }
    for (const [query, arr] of topPagesByQuery) {
      arr.sort((a, b) => b.impressions - a.impressions || b.clicks - a.clicks);
      topPagesByQuery.set(query, arr.slice(0, 5));
    }

    const topQueries: SeoQueryRow[] = queriesCur.rows
      .sort((a, b) => b.impressions - a.impressions || b.clicks - a.clicks)
      .slice(0, 60)
      .map((r) => {
        const query = r.keys[0] ?? "";
        const prevRow = prevByQuery.get(query);
        const prevAgg = prevRow
          ? { clicks: prevRow.clicks, impressions: prevRow.impressions, ctr: prevRow.ctr, position: prevRow.position }
          : { clicks: 0, impressions: 0, ctr: 0, position: 0 };
        return {
          query,
          ...trend(
            { clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position },
            prevAgg,
          ),
          topPages: topPagesByQuery.get(query) ?? [],
        };
      });

    const pagesForAudit = topPages
      .filter((p) => p.impressions >= 80)
      .slice(0, 12)
      .map((p) => {
        const base = siteUrl.replace(/\/$/, "");
        const path = normalizePathFromPageKey(siteUrl, p.page);
        return `${base}${path === "/" ? "/" : path}`;
      });

    const audits: SeoPageAudit[] = [];
    for (const url of pagesForAudit) {
      audits.push(await auditPage(url));
    }

    const competitorGaps = await detectCompetitorGaps(
      topQueries.map((q) => ({ query: q.query, impressions: q.impressions, position: q.position })),
    );

    const issues = detectSeoIssues({ siteUrl, pages: topPages, queries: topQueries, audits });

    const snapshot: SeoWeeklyDoc = {
      weekId,
      generatedAt: new Date().toISOString(),
      siteUrl,
      range: { startDateIst: range.start, endDateIst: range.end, days },
      rangePrev: { startDateIst: prev.start, endDateIst: prev.end, days },
      topPages: topPages.slice(0, 30),
      topQueries: topQueries.slice(0, 40),
      audits,
      issues,
      competitorGaps,
    };

    await db.collection("seoWeekly").doc(weekId).set(stripUndefinedDeep(snapshot), { merge: true });

    const report = await generateSeoWeeklyReport(snapshot);
    if (report) {
      await db
        .collection("seoWeeklyReports")
        .doc(weekId)
        .set(stripUndefinedDeep(report), { merge: true });

      if (opts?.queueBlogTopics) {
        const titles = report.blogTopicsToQueue.slice(0, 10);
        for (const t of titles) {
          const title = String(t.title ?? "").trim();
          if (!title) continue;
          await addTopicToQueue({
            title,
            serviceSlug: t.serviceSlug,
            language: t.language ?? "hinglish",
          });
        }
      }
    }

    return { ok: true, weekId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[seo-weekly pipeline]", msg);
    return { ok: false, weekId, error: msg };
  }
}

