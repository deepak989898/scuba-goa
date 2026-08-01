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
}): string {
  if (input.pageMatchStatus === "no_page") {
    return "Create a high-quality page matching search intent (no ranking guarantee)";
  }
  if (input.pageMatchStatus === "cannibalisation") {
    return "Consolidate competing pages and strengthen one primary URL";
  }
  if (input.pageMatchStatus === "wrong_page") {
    return "Align ranking URL with the best-fit page (title, internal links, intent)";
  }
  if (input.myPosition == null) {
    return "Refresh rankings / improve existing related page for discovery";
  }
  if (input.myPosition > 20) {
    return "Expand content and internal links — ranking opportunity (not guaranteed)";
  }
  if (input.myPosition > 10) {
    return "Strengthen page for page-1 push — estimated improvement potential: Medium";
  }
  if (input.myPosition > 3) {
    return "CTR and content refresh for top-3 opportunity — impact not guaranteed";
  }
  return "Maintain and monitor — already strong position";
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
