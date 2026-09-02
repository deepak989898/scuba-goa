import type { ImageBrief, VisualCategory } from "./types";

export type RelevanceValidation = {
  relevanceScore: number;
  qualityScore: number;
  safetyScore: number;
  overallImageScore: number;
  validationNotes: string[];
  passed: boolean;
};

const SCUBA_MARKERS = [
  "scuba",
  "diver",
  "underwater",
  "coral",
  "regulator",
  "bcd",
  "fins",
  "oxygen tank",
];

/**
 * Heuristic relevance gate (prompt/brief based).
 * Vision API optional later — this blocks wrong-topic prompts before/after gen.
 */
export function validateImageBriefRelevance(
  brief: ImageBrief,
  opts?: {
    minRelevance?: number;
    minOverall?: number;
  },
): RelevanceValidation {
  const notes: string[] = [];
  let relevance = 82;
  let quality = 88;
  let safety = 92;

  const title = brief.articleTitle.toLowerCase();
  const promptBlob = [
    brief.scene,
    brief.mainSubject,
    brief.activity,
    brief.visualCategory,
  ]
    .join(" ")
    .toLowerCase();

  // Category coherence with title
  const nightlifeTitle = /night.?club|nightlife|disco|party night|ruski|ruskii/.test(title);
  const casinoTitle =
    /casino|gambling|poker|big daddy|deltin|blackjack|roulette/.test(title);
  const waterSportsTitle = /water.?sport|parasail|jet.?ski|banana/.test(title);
  const scubaTitle = /scuba|diving|underwater/.test(title);
  const safetyTitle = /safety|beginner tip|buddy/.test(title);
  const comparisonTitle = /\bvs\.?\b|versus|compare/.test(title);

  const pricingTitle =
    /price|pricing|cost|cheap|budget|package|how much|fee|age limit|minimum age|entry age/.test(
      title,
    );

  if (comparisonTitle && /goa|andaman|maldives|lakshadweep|thailand|bali/i.test(title)) {
    if (brief.visualCategory === "destination_comparison") {
      relevance += 18;
    } else {
      relevance -= 40;
      notes.push("Comparison title not mapped to destination_comparison visuals");
    }
    if (
      /briefing|beach scene with|generic/.test(promptBlob) &&
      !/split|diptych|left|right|half/.test(promptBlob)
    ) {
      relevance -= 25;
      notes.push("Comparison article still using a single non-split scene");
    }
  } else if (pricingTitle && scubaTitle) {
    if (brief.visualCategory === "scuba_pricing") {
      relevance += 18;
    } else {
      relevance -= 35;
      notes.push("Price-guide title not mapped to scuba_pricing visuals");
    }
    if (
      /booking|package|desk|counter|folder|tier|brochure|option/.test(promptBlob)
    ) {
      relevance += 10;
    } else if (/tank|beach|lined up|reef|underwater/.test(promptBlob)) {
      relevance -= 30;
      notes.push("Price guide still using generic dive lifestyle scene");
    }
  } else if (pricingTitle && casinoTitle) {
    if (brief.visualCategory === "casino_pricing" || brief.visualCategory === "casino") {
      relevance += 18;
    } else {
      relevance -= 30;
      notes.push("Casino price/age title not mapped to casino visuals");
    }
    if (/mandovi|ship|cruise|floating|jetty|boarding|panjim/i.test(promptBlob)) {
      relevance += 12;
    }
  } else if (casinoTitle) {
    if (brief.visualCategory === "casino" || brief.visualCategory === "casino_pricing") {
      relevance += 18;
    } else if (brief.visualCategory.startsWith("scuba_")) {
      relevance -= 50;
      notes.push("Casino title incorrectly classified as scuba");
    } else {
      relevance -= 25;
      notes.push("Casino title not mapped to casino visuals");
    }
    if (/mandovi|floating|cruise ship|offshore|big daddy|deltin|panjim/i.test(promptBlob)) {
      relevance += 12;
    } else if (/indoor poker|generic casino table only/i.test(promptBlob)) {
      relevance -= 15;
      notes.push("Casino brief missing Mandovi ship / offshore venue context");
    }
    if (SCUBA_MARKERS.some((m) => promptBlob.includes(m))) {
      relevance -= 45;
      notes.push("Scuba markers present in casino image brief");
    }
  } else if (nightlifeTitle) {
    if (brief.visualCategory === "nightlife" || brief.visualCategory === "night_club") {
      relevance += 15;
    } else {
      relevance -= 45;
      notes.push("Nightlife title mapped to non-nightlife visual category");
    }
    if (SCUBA_MARKERS.some((m) => promptBlob.includes(m))) {
      relevance -= 50;
      notes.push("Scuba markers present in nightlife image brief");
    }
  } else if (waterSportsTitle && !scubaTitle) {
    if (
      ["water_sports", "parasailing", "jet_ski", "flyboarding"].includes(
        brief.visualCategory,
      )
    ) {
      relevance += 15;
    } else if (brief.visualCategory.startsWith("scuba_")) {
      relevance -= 45;
      notes.push("Water-sports title incorrectly classified as scuba");
    }
  } else if (scubaTitle && safetyTitle) {
    if (brief.visualCategory === "scuba_safety" || brief.visualCategory === "scuba_beginner") {
      relevance += 15;
    } else if (
      brief.visualCategory === "scuba_diving" &&
      /coral|reef|exploring/.test(promptBlob) &&
      !/instructor|mask|regulator|buddy|briefing/.test(promptBlob)
    ) {
      relevance -= 20;
      notes.push("Safety article still using generic reef exploration scene");
    } else if (brief.visualCategory.startsWith("scuba_")) {
      relevance += 8;
    }
  } else if (scubaTitle && brief.visualCategory.startsWith("scuba_")) {
    relevance += 12;
  } else if (
    brief.visualCategory === "general_travel" ||
    brief.visualCategory === "beach_guide" ||
    brief.visualCategory === "north_goa" ||
    brief.visualCategory === "south_goa" ||
    brief.visualCategory === "island_guide" ||
    brief.visualCategory === "family" ||
    brief.visualCategory === "couples" ||
    brief.visualCategory === "dudhsagar" ||
    brief.visualCategory === "booking_guide" ||
    brief.visualCategory === "dinner_cruise" ||
    brief.visualCategory === "yacht" ||
    brief.visualCategory === "bungee" ||
    brief.visualCategory === "casino" ||
    brief.visualCategory === "dolphin_trip"
  ) {
    relevance += 10;
  }

  if (!brief.mustAvoid.length) {
    quality -= 5;
    notes.push("Missing mustAvoid exclusions");
  }
  if (!brief.uniquenessSignature) {
    quality -= 10;
    notes.push("Missing uniqueness signature");
  }
  if (brief.mustAvoid.some((x) => /unsafe|panic|emergency|children/.test(x.toLowerCase()))) {
    safety += 5;
  }

  relevance = Math.max(0, Math.min(100, relevance));
  quality = Math.max(0, Math.min(100, quality));
  safety = Math.max(0, Math.min(100, safety));

  const overall = Math.round(relevance * 0.5 + quality * 0.25 + safety * 0.25);
  const minRel = opts?.minRelevance ?? 90;
  const minOverall = opts?.minOverall ?? 88;
  const passed = relevance >= minRel && overall >= minOverall;

  if (!passed) {
    notes.push(
      `Scores below threshold (relevance ${relevance}/${minRel}, overall ${overall}/${minOverall})`,
    );
  }

  return {
    relevanceScore: relevance,
    qualityScore: quality,
    safetyScore: safety,
    overallImageScore: overall,
    validationNotes: notes,
    passed,
  };
}

export function categorySuggestsWrongTopic(
  visualCategory: VisualCategory,
  title: string,
): boolean {
  const t = title.toLowerCase();
  if (
    /\bvs\.?\b|versus/.test(t) &&
    /goa|andaman|maldives/.test(t) &&
    visualCategory !== "destination_comparison"
  ) {
    return true;
  }
  if (/nightlife|night.?club|disco/.test(t) && visualCategory.startsWith("scuba_")) {
    return true;
  }
  if (
    /casino|gambling|poker|big daddy|deltin/.test(t) &&
    (visualCategory.startsWith("scuba_") ||
      visualCategory === "general_travel" ||
      visualCategory === "beach_guide")
  ) {
    return true;
  }
  if (
    /water.?sport|parasail|jet.?ski/.test(t) &&
    !/scuba|diving/.test(t) &&
    visualCategory.startsWith("scuba_")
  ) {
    return true;
  }
  return false;
}
