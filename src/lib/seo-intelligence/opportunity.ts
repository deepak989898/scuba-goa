import type {
  SeoIntelPageMatchStatus,
  SeoIntelSearchIntent,
} from "./types";

export function scoreOpportunity(input: {
  myPosition: number | null;
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  bestCompetitorPosition: number | null;
  pageMatchStatus: SeoIntelPageMatchStatus;
  intent: SeoIntelSearchIntent;
  businessValueScore: number;
}): number {
  let score = 0;
  const pos = input.myPosition;
  const impressions = input.impressions ?? 0;

  if (pos == null || pos <= 0) {
    score += input.pageMatchStatus === "no_page" ? 45 : 30;
  } else if (pos > 20) score += 35;
  else if (pos > 10) score += 42;
  else if (pos > 3) score += 38;
  else score += 10;

  if (impressions >= 200) score += 15;
  else if (impressions >= 50) score += 10;
  else if (impressions >= 10) score += 5;

  if (input.bestCompetitorPosition != null && input.bestCompetitorPosition <= 5) {
    score += 12;
  }

  if (input.pageMatchStatus === "no_page") score += 15;
  if (input.pageMatchStatus === "wrong_page") score += 12;
  if (input.pageMatchStatus === "cannibalisation") score += 10;
  if (input.pageMatchStatus === "related_page") score += 6;

  if (input.intent === "transactional" || input.intent === "commercial") {
    score += 8;
  }

  score += Math.min(15, Math.round(input.businessValueScore / 8));

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function recommendedAction(input: {
  myPosition: number | null;
  pageMatchStatus: SeoIntelPageMatchStatus;
  opportunityScore: number;
  bestCompetitorPosition?: number | null;
  bestCompetitorDomain?: string | null;
  existingPageUrl?: string | null;
  keyword?: string;
}): string {
  const me = input.myPosition;
  const comp = input.bestCompetitorPosition ?? null;
  const domain = (input.bestCompetitorDomain || "competitor").replace(
    /^www\./,
    "",
  );
  const page = input.existingPageUrl || "your page";
  const behind =
    comp != null && (me == null || me <= 0 || me > comp);

  if (input.pageMatchStatus === "no_page") {
    return "Create a high-quality page matching search intent (no ranking guarantee)";
  }
  if (input.pageMatchStatus === "cannibalisation") {
    return behind
      ? `${domain} leads while your pages compete — pick one primary URL, unify title/H1, add internal links (impact not guaranteed)`
      : "Consolidate competing pages and strengthen one primary URL";
  }
  if (input.pageMatchStatus === "wrong_page") {
    return `Wrong page ranking — retarget title/H1/meta on ${page} and point internal links there`;
  }
  if (behind && comp != null) {
    if (me == null || me <= 0) {
      return `${domain} is #${comp}; you are not ranking — strengthen ${page}: title, H1, FAQs, internal links`;
    }
    return `${domain} #${comp} beats you #${Math.round(me)} — improve title/CTR, expand FAQs/content, add internal links from related posts`;
  }
  if (me == null || me <= 0) {
    return "Page exists but not ranking yet — refresh SERP, then improve on-page SEO + internal links";
  }
  if (me > 20) {
    return `You are #${Math.round(me)} — expand content depth, FAQs, and internal links (impact not guaranteed)`;
  }
  if (me > 10) {
    return `You are #${Math.round(me)} (page 2) — tighten title/meta for intent, clarify packages/pricing, earn internal links`;
  }
  if (me > 3) {
    return `You are #${Math.round(me)} — CTR push: sharper title + meta, trust signals, clear booking CTA`;
  }
  return `Strong #${Math.round(me)} — maintain freshness and watch competitors`;
}

export function businessValueFromCategory(category: string, intent: string): number {
  const commercialBoost =
    intent === "transactional" || intent === "commercial" ? 20 : 0;
  const high = [
    "Scuba Diving",
    "Water Sports",
    "Grand Island",
    "Tour Packages",
    "Snorkelling",
  ];
  if (high.includes(category)) return 70 + commercialBoost;
  if (category === "General") return 40 + commercialBoost;
  return 55 + commercialBoost;
}
