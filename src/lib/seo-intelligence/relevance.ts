import {
  isExcludedDomain,
  isMarketplaceDomain,
  isOwnDomain,
  normaliseDomain,
} from "./domain";

const GOA_HINTS = [
  "goa",
  "baga",
  "calangute",
  "candolim",
  "panjim",
  "panaji",
  "anjuna",
  "morjim",
  "palolem",
  "dudhsagar",
];

const NICHE_HINTS = [
  "scuba",
  "diving",
  "snorkel",
  "parasail",
  "jetski",
  "jet-ski",
  "watersport",
  "water-sport",
  "bungee",
  "flyboard",
  "casino",
  "cruise",
  "dolphin",
  "adventure",
  "tour",
  "boat",
];

/**
 * Score competitor relevance 0–100 from SERP appearance + niche signals.
 * Used for discovery ranking; admin still reviews pending domains.
 */
export function scoreCompetitorRelevance(input: {
  domain: string;
  sharedKeywordHits: number;
  top10Appearances: number;
  sampleTitles?: string[];
  sampleSnippets?: string[];
}): {
  relevanceScore: number;
  confidence: number;
  type: "direct_local" | "marketplace" | "informational" | "other";
  excluded: boolean;
  reason: string;
} {
  const domain = normaliseDomain(input.domain);
  if (!domain || isOwnDomain(domain)) {
    return {
      relevanceScore: 0,
      confidence: 0,
      type: "other",
      excluded: true,
      reason: "Own or invalid domain",
    };
  }
  if (isExcludedDomain(domain)) {
    return {
      relevanceScore: 0,
      confidence: 90,
      type: "other",
      excluded: true,
      reason: "Excluded social/generic platform",
    };
  }

  const text = [
    domain,
    ...(input.sampleTitles ?? []),
    ...(input.sampleSnippets ?? []),
  ]
    .join(" ")
    .toLowerCase();

  let score = 0;
  score += Math.min(40, input.sharedKeywordHits * 8);
  score += Math.min(30, input.top10Appearances * 10);

  const goaHits = GOA_HINTS.filter((h) => text.includes(h)).length;
  const nicheHits = NICHE_HINTS.filter((h) => text.includes(h)).length;
  score += Math.min(15, goaHits * 5);
  score += Math.min(15, nicheHits * 3);

  const marketplace = isMarketplaceDomain(domain);
  if (marketplace) {
    score = Math.min(score, 70);
  }

  const relevanceScore = Math.max(0, Math.min(100, Math.round(score)));
  const confidence = Math.max(
    20,
    Math.min(
      95,
      Math.round(
        40 +
          input.top10Appearances * 12 +
          Math.min(20, input.sharedKeywordHits * 4) +
          goaHits * 5,
      ),
    ),
  );

  return {
    relevanceScore,
    confidence,
    type: marketplace
      ? "marketplace"
      : goaHits + nicheHits >= 2
        ? "direct_local"
        : "informational",
    excluded: false,
    reason: marketplace
      ? "Marketplace / large portal"
      : "Local or niche travel relevance",
  };
}
