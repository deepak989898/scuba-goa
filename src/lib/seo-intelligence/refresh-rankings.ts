import { listCompetitors } from "./competitors";
import { appendSeoIntelLog } from "./activity-log";
import {
  filterOwnedKeywords,
  ownedKeywordUrgency,
} from "./discover-keywords";
import { isOwnDomain, normaliseDomain } from "./domain";
import {
  listKeywords,
  saveRankSnapshot,
  upsertKeyword,
} from "./keywords-store";
import {
  recommendedAction,
  scoreOpportunity,
} from "./opportunity";
import { buildSitePageCorpus } from "./page-corpus";
import { matchKeywordToPages } from "./page-match";
import { getSerpProvider } from "./providers";
import type { SeoIntelCompetitorPosition, SeoIntelKeyword } from "./types";

function pathFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    return u.pathname || "/";
  } catch {
    return null;
  }
}

/**
 * Refresh SERP rankings for keywords vs approved competitors.
 * Bounded to control Serper spend.
 * focus=owned → prefer existing site pages (improve what you have first).
 */
export async function refreshKeywordRankings(opts?: {
  actor?: string;
  limit?: number;
  focus?: "opportunity" | "owned";
}): Promise<{
  configured: boolean;
  refreshed: number;
  skipped: number;
  errors: string[];
  focus: "opportunity" | "owned";
}> {
  const actor = opts?.actor ?? "system";
  const focus = opts?.focus === "owned" ? "owned" : "opportunity";
  const limit = Math.min(25, Math.max(1, opts?.limit ?? 12));
  const provider = getSerpProvider();
  const errors: string[] = [];

  if (!provider.isConfigured()) {
    await appendSeoIntelLog({
      action: "keywords.refresh_rankings",
      entityType: "keyword",
      actor,
      details: "SERP provider not configured",
      result: "skipped",
    });
    return {
      configured: false,
      refreshed: 0,
      skipped: 0,
      errors: ["SERP provider not configured. Set SERPER_API_KEY."],
      focus,
    };
  }

  const [keywords, competitors, corpus] = await Promise.all([
    listKeywords({ status: "active" }),
    listCompetitors(),
    buildSitePageCorpus(),
  ]);

  const tracked = competitors.filter(
    (c) => c.status === "approved" && !c.paused && !c.blocked,
  );
  const competitorDomains = tracked.map((c) => c.canonicalDomain);

  const pool =
    focus === "owned" ? filterOwnedKeywords(keywords) : [...keywords];
  const targets = pool
    .sort((a, b) => {
      if (focus === "owned") {
        return ownedKeywordUrgency(b) - ownedKeywordUrgency(a);
      }
      return (
        (b.opportunityScore ?? 0) - (a.opportunityScore ?? 0) ||
        (b.impressions ?? 0) - (a.impressions ?? 0)
      );
    })
    .slice(0, limit);

  let refreshed = 0;
  let skipped = 0;
  const checkedAt = new Date().toISOString();

  for (const kw of targets) {
    try {
      const serp = await provider.searchKeyword(kw.keyword, { num: 15 });
      if (serp.error) {
        errors.push(`${kw.keyword}: ${serp.error}`);
        skipped += 1;
        continue;
      }

      let myPosition: number | null = null;
      let myUrl: string | null = null;
      const competitorPositions: SeoIntelCompetitorPosition[] = [];

      for (const row of serp.organic) {
        const domain = normaliseDomain(row.domain);
        if (!domain) continue;
        if (isOwnDomain(domain)) {
          if (myPosition == null) {
            myPosition = row.position;
            myUrl = pathFromUrl(row.url) || row.url;
          }
          continue;
        }
        if (competitorDomains.includes(domain)) {
          competitorPositions.push({
            domain,
            position: row.position,
            url: row.url,
          });
        }
      }

      // Also capture top organic domains not yet tracked (preview only)
      if (competitorPositions.length < 3) {
        for (const row of serp.organic) {
          const domain = normaliseDomain(row.domain);
          if (!domain || isOwnDomain(domain)) continue;
          if (competitorPositions.some((c) => c.domain === domain)) continue;
          competitorPositions.push({
            domain,
            position: row.position,
            url: row.url,
          });
          if (competitorPositions.length >= 3) break;
        }
      }

      const preview = competitorPositions
        .sort((a, b) => (a.position ?? 99) - (b.position ?? 99))
        .slice(0, 3);
      const best = preview[0] ?? null;
      const rankingGap =
        myPosition != null && best?.position != null
          ? myPosition - best.position
          : best?.position != null
            ? null
            : null;

      const match = matchKeywordToPages(kw.keyword, corpus, {
        preferType: kw.recommendedContentType,
        rankingUrl: myUrl,
      });

      let pageMatchStatus = match.status;
      if (myPosition == null && match.status === "correct_page") {
        pageMatchStatus = "weak_ranking";
      }

      const opportunityScore = scoreOpportunity({
        myPosition,
        impressions: kw.impressions,
        clicks: kw.clicks,
        ctr: kw.ctr,
        bestCompetitorPosition: best?.position ?? null,
        pageMatchStatus,
        intent: kw.intent,
        businessValueScore: kw.businessValueScore,
      });

      await saveRankSnapshot({
        keywordId: kw.id,
        checkedAt,
        myPosition,
        myUrl,
        competitorPositions: preview,
        impressions: kw.impressions,
        clicks: kw.clicks,
        ctr: kw.ctr,
        source: serp.provider,
        device: "all",
        country: process.env.SERP_COUNTRY?.trim() || "IN",
      });

      await upsertKeyword({
        ...kw,
        existingPageId: match.pageId,
        existingPageUrl: match.pageUrl,
        existingPageType: match.pageType,
        pageMatchStatus,
        pageMatchNote: match.note,
        myPosition,
        myUrl: myUrl || match.pageUrl,
        bestCompetitorPosition: best?.position ?? null,
        bestCompetitorDomain: best?.domain ?? null,
        rankingGap,
        opportunityScore,
        priorityScore: opportunityScore,
        recommendedAction: recommendedAction({
          myPosition,
          pageMatchStatus,
          opportunityScore,
          bestCompetitorPosition: best?.position ?? null,
          bestCompetitorDomain: best?.domain ?? null,
          existingPageUrl: match.pageUrl || kw.existingPageUrl,
          keyword: kw.keyword,
        }),
        competitorPreview: preview,
        lastCheckedAt: checkedAt,
      });

      refreshed += 1;
    } catch (e) {
      skipped += 1;
      errors.push(
        `${kw.keyword}: ${e instanceof Error ? e.message : "refresh failed"}`,
      );
    }
  }

  await appendSeoIntelLog({
    action: "keywords.refresh_rankings",
    entityType: "keyword",
    actor,
    details: `Refreshed ${refreshed} keywords (focus=${focus}); skipped ${skipped}`,
    result: errors.length && !refreshed ? "error" : "ok",
    error: errors[0] ?? null,
  });

  return {
    configured: true,
    refreshed,
    skipped,
    errors: errors.slice(0, 12),
    focus,
  };
}

export function keywordTableRow(k: SeoIntelKeyword) {
  return {
    ...k,
    competitors: k.competitorPreview ?? [],
  };
}
