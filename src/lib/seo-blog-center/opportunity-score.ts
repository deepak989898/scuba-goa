import type {
  SuggestedAction,
} from "@/lib/seo-blog-center/types";
import type { ClassifiedKeyword } from "./providers/types";
import { normalizeKeywordKey } from "@/lib/seo-blog-center/normalize-keywords";
import { buildRelevanceHaystack } from "@/lib/seo-blog-center/service-keyword-context";

export type ScoreContext = {
  serviceName: string;
  seedKeyword?: string;
  serviceSlug?: string;
  existingTitles: string[];
  existingKeywords: string[];
};

export type ScoredKeyword = ClassifiedKeyword & {
  opportunityScore: number;
  scoreExplanation: string;
  cannibalizationRisk: "none" | "low" | "medium" | "high";
  suggestedAction: SuggestedAction;
  searchVolume: number;
  seoScore: number;
};

function tokenOverlap(a: string, b: string): number {
  const as = new Set(normalizeKeywordKey(a).split(" ").filter((t) => t.length > 2));
  const bs = new Set(normalizeKeywordKey(b).split(" ").filter((t) => t.length > 2));
  if (as.size === 0 || bs.size === 0) return 0;
  let hit = 0;
  for (const t of as) if (bs.has(t)) hit += 1;
  return hit / Math.max(as.size, bs.size);
}

/**
 * Transparent opportunity score 0–100 (not a Google ranking prediction).
 * Weights: demand 20, relevance 20, rank opp 15, GSC 15, commercial 10, gap 10, local 5, season 5.
 */
export function scoreKeywordOpportunity(
  kw: ClassifiedKeyword,
  ctx: ScoreContext,
): ScoredKeyword {
  const parts: string[] = [];
  let score = 0;

  const volume = kw.monthlySearches ?? (kw.gscImpressions ? Math.round(kw.gscImpressions / 4) : 0);
  const demand = Math.min(20, Math.log10(volume + 1) * 5);
  score += demand;
  parts.push(
    kw.monthlySearches != null
      ? `Demand ${Math.round(demand)}/20 (Ads volume ${kw.monthlySearches})`
      : kw.gscImpressions
        ? `Demand ${Math.round(demand)}/20 (GSC impressions proxy)`
        : `Demand ${Math.round(demand)}/20 (volume unavailable)`,
  );

  const hay = buildRelevanceHaystack({
    serviceName: ctx.serviceName,
    seedKeyword: ctx.seedKeyword ?? ctx.serviceName,
    serviceSlug: ctx.serviceSlug ?? "",
  });
  const relTokens = normalizeKeywordKey(kw.keyword).split(" ");
  let relHits = 0;
  for (const t of relTokens) if (hay.includes(t)) relHits += 1;
  const relevance = Math.min(20, (relHits / Math.max(1, relTokens.length)) * 20 + 4);
  score += relevance;
  parts.push(`Relevance ${Math.round(relevance)}/20`);

  const comp =
    kw.competition === "low" ? 15 : kw.competition === "medium" ? 10 : 5;
  score += comp;
  parts.push(`Competition opportunity ${comp}/15`);

  let gscPts = 0;
  if (kw.gscImpressions && kw.gscImpressions > 20) {
    gscPts += Math.min(8, Math.log10(kw.gscImpressions) * 2.5);
  }
  if (kw.gscPosition && kw.gscPosition >= 5 && kw.gscPosition <= 30) {
    gscPts += 7;
  }
  gscPts = Math.min(15, gscPts);
  score += gscPts;
  parts.push(`Search Console ${Math.round(gscPts)}/15`);

  const commercial =
    kw.intent === "price" || kw.intent === "transactional" || kw.intent === "commercial"
      ? 10
      : kw.intent === "comparison"
        ? 7
        : 3;
  score += commercial;
  parts.push(`Commercial ${commercial}/10`);

  let maxOverlap = 0;
  for (const t of ctx.existingTitles) {
    maxOverlap = Math.max(maxOverlap, tokenOverlap(kw.keyword, t));
  }
  for (const t of ctx.existingKeywords) {
    maxOverlap = Math.max(maxOverlap, tokenOverlap(kw.keyword, t));
  }
  const gap = Math.round((1 - maxOverlap) * 10);
  score += gap;
  parts.push(`Content gap ${gap}/10`);

  const local = /\bgoa|baga|calangute|anjuna|palolem\b/i.test(kw.keyword) ? 5 : 2;
  score += local;
  parts.push(`Local ${local}/5`);

  const season = kw.intent === "seasonal" ? 5 : 2;
  score += season;
  parts.push(`Seasonality ${season}/5`);

  let cannibalizationRisk: ScoredKeyword["cannibalizationRisk"] = "none";
  let suggestedAction: SuggestedAction = "create_article";

  if (kw.contentType === "optimize_service_page") {
    score -= 25;
    suggestedAction = "optimize_existing";
    parts.push("Penalty −25 (better as service page)");
  }
  if (maxOverlap >= 0.75) {
    score -= 40;
    cannibalizationRisk = "high";
    suggestedAction = "optimize_existing";
    parts.push("Penalty −40 (existing article covers intent)");
  } else if (maxOverlap >= 0.5) {
    score -= 30;
    cannibalizationRisk = "medium";
    suggestedAction = "merge_cluster";
    parts.push("Penalty −30 (cannibalization risk)");
  } else if (maxOverlap >= 0.35) {
    cannibalizationRisk = "low";
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const searchVolume = volume;
  const seoScore = score;

  return {
    ...kw,
    opportunityScore: score,
    scoreExplanation: parts.join(" · "),
    cannibalizationRisk,
    suggestedAction,
    searchVolume,
    seoScore,
  };
}
