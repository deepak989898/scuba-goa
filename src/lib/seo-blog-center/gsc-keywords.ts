import { fetchGscRows } from "@/lib/seo-agent/search-console-period";
import type { KeywordSource, SeoBlogKeyword } from "@/lib/seo-blog-center/types";
import { computeSeoScore, inferCategory, slugify } from "@/lib/seo-blog-center/utils";

function hashKeyword(keyword: string): number {
  let h = 0;
  for (let i = 0; i < keyword.length; i++) h = (h << 5) - h + keyword.charCodeAt(i);
  return Math.abs(h);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function buildGscKeywordRecord(
  query: string,
  metrics: { clicks: number; impressions: number; ctr: number; position: number },
): SeoBlogKeyword {
  const seed = hashKeyword(query);
  const competition =
    metrics.position <= 10 ? "high" : metrics.position <= 25 ? "medium" : "low";
  const searchVolume = Math.max(500, Math.round(metrics.impressions * 1.2));
  const trendScore = Math.min(95, 40 + Math.round(metrics.clicks * 2));
  const now = new Date().toISOString();

  return {
    id: `kw_gsc_${slugify(query)}_${seed.toString(36).slice(0, 5)}`,
    keyword: query.trim(),
    searchVolume,
    competition,
    trendScore,
    category: inferCategory(query),
    destination: query.toLowerCase().includes("goa") ? "Goa" : undefined,
    seoScore: computeSeoScore({
      searchVolume,
      competition,
      trendScore,
      gscImpressions: metrics.impressions,
      gscPosition: metrics.position,
    }),
    status: "pending",
    source: "gsc" as KeywordSource,
    gscClicks: metrics.clicks,
    gscImpressions: metrics.impressions,
    gscCtr: metrics.ctr,
    gscPosition: metrics.position,
    createdAt: now,
  };
}

/** Import keyword opportunities from Google Search Console (last 28 days). */
export async function discoverGscKeywords(
  excludeSet: Set<string>,
  maxResults = 25,
): Promise<{ keywords: SeoBlogKeyword[]; error?: string }> {
  const result = await fetchGscRows({
    startDate: daysAgo(28),
    endDate: daysAgo(1),
    dimensions: ["query"],
    rowLimit: 500,
  });

  if (!result.ok) {
    return { keywords: [], error: result.error };
  }

  const candidates = result.rows
    .filter((r) => {
      const q = r.keys[0]?.trim() ?? "";
      if (q.length < 4 || q.length > 120) return false;
      if (excludeSet.has(q.toLowerCase())) return false;
      if (r.impressions < 5) return false;
      const l = q.toLowerCase();
      const relevant =
        /scuba|diving|goa|snorkel|water sport|parasail|island|beach|boat|underwater|padi|grande|baga|calangute|booking|package|price|cost|tour|trip|adventure/.test(
          l,
        );
      if (!relevant) return false;
      const opportunity = r.position > 8 || r.ctr < 0.03 || r.impressions >= 20;
      return opportunity;
    })
    .sort((a, b) => {
      const scoreA = a.impressions * (a.position > 10 ? 1.5 : 1);
      const scoreB = b.impressions * (b.position > 10 ? 1.5 : 1);
      return scoreB - scoreA;
    });

  const keywords: SeoBlogKeyword[] = [];
  for (const row of candidates) {
    if (keywords.length >= maxResults) break;
    const q = row.keys[0]!.trim();
    const key = q.toLowerCase();
    if (excludeSet.has(key)) continue;
    excludeSet.add(key);
    keywords.push(
      buildGscKeywordRecord(q, {
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
      }),
    );
  }

  keywords.sort((a, b) => b.seoScore - a.seoScore);
  return { keywords };
}

export async function fetchGscDashboardSummary(): Promise<{
  ok: boolean;
  siteUrl?: string;
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
  topQueries?: { query: string; clicks: number; impressions: number; ctr: number; position: number }[];
  error?: string;
}> {
  const result = await fetchGscRows({
    startDate: daysAgo(7),
    endDate: daysAgo(1),
    dimensions: ["query"],
    rowLimit: 50,
  });

  if (!result.ok) return { ok: false, error: result.error };

  let clicks = 0;
  let impressions = 0;
  let positionSum = 0;
  for (const row of result.rows) {
    clicks += row.clicks;
    impressions += row.impressions;
    positionSum += row.position * row.impressions;
  }

  const topQueries = result.rows.slice(0, 15).map((r) => ({
    query: r.keys[0] ?? "",
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: r.ctr,
    position: r.position,
  }));

  return {
    ok: true,
    siteUrl: result.siteUrl,
    clicks,
    impressions,
    ctr: impressions > 0 ? clicks / impressions : 0,
    position: impressions > 0 ? positionSum / impressions : 0,
    topQueries,
  };
}
