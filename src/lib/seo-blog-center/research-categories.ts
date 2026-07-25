import type { ClassifiedKeyword, RawKeywordIdea, ResearchInput } from "@/lib/seo-blog-center/providers/types";

/**
 * Content-angle categories for keyword research (admin checkboxes).
 * Broader than KeywordCategory (service vertical) — these drive SEO page types.
 */
export type ResearchCategoryId =
  | "high_priority"
  | "google_suggest"
  | "location_pages"
  | "question_blogs"
  | "comparison_blogs"
  | "seasonal_blogs"
  | "money_keywords"
  | "experience_blogs"
  | "package_specific"
  | "nearby_activities";

export type ResearchCategoryDef = {
  id: ResearchCategoryId;
  label: string;
  shortLabel: string;
  description: string;
};

export const RESEARCH_CATEGORIES: ResearchCategoryDef[] = [
  {
    id: "high_priority",
    label: "Category 1 - High Priority (Commercial + Ranking + Booking)",
    shortLabel: "High Priority",
    description: "Book, best, hire, top-ranked commercial queries",
  },
  {
    id: "google_suggest",
    label: "Category 2 - Google Suggestion Keywords",
    shortLabel: "Google Suggest",
    description: "Pull autocomplete / suggest ideas when enabled",
  },
  {
    id: "location_pages",
    label: "Category 3 - Location Pages",
    shortLabel: "Location Pages",
    description: "Beach, island, North/South Goa place pages",
  },
  {
    id: "question_blogs",
    label: "Category 4 - Question Blogs",
    shortLabel: "Question Blogs",
    description: "How / what / is it safe FAQ-style posts",
  },
  {
    id: "comparison_blogs",
    label: "Category 5 - Comparison Blogs",
    shortLabel: "Comparison Blogs",
    description: "Vs, best of, which is better",
  },
  {
    id: "seasonal_blogs",
    label: "Category 6 - Seasonal Blogs",
    shortLabel: "Seasonal Blogs",
    description: "Best time, monsoon, winter, months",
  },
  {
    id: "money_keywords",
    label: "Category 7 - Money Keywords",
    shortLabel: "Money Keywords",
    description: "Price, cost, charges, cheap, budget",
  },
  {
    id: "experience_blogs",
    label: "Category 8 - Experience Blogs",
    shortLabel: "Experience Blogs",
    description: "What to expect, first time, beginner experience",
  },
  {
    id: "package_specific",
    label: "Category 9 - Package Specific Pages",
    shortLabel: "Package Pages",
    description: "Packages, inclusions, combo deals",
  },
  {
    id: "nearby_activities",
    label: "Category 10 - Nearby Activities",
    shortLabel: "Nearby Activities",
    description: "Things to do nearby, related water sports",
  },
];

export const ALL_RESEARCH_CATEGORY_IDS: ResearchCategoryId[] =
  RESEARCH_CATEGORIES.map((c) => c.id);

export function parseResearchCategories(
  raw: unknown,
): ResearchCategoryId[] {
  const allowed = new Set<string>(ALL_RESEARCH_CATEGORY_IDS);
  if (!Array.isArray(raw) || raw.length === 0) {
    return [...ALL_RESEARCH_CATEGORY_IDS];
  }
  const picked = raw
    .map((x) => String(x).trim())
    .filter((id): id is ResearchCategoryId => allowed.has(id));
  return picked.length > 0 ? picked : [...ALL_RESEARCH_CATEGORY_IDS];
}

/** Sync legacy include* flags from selected research categories. */
export function applyResearchCategoryFlags(
  input: ResearchInput,
): ResearchInput {
  const cats = new Set(
    input.researchCategories?.length
      ? input.researchCategories
      : ALL_RESEARCH_CATEGORY_IDS,
  );
  return {
    ...input,
    researchCategories: [...cats] as ResearchCategoryId[],
    includeCommercial: cats.has("high_priority"),
    includeInformational:
      cats.has("experience_blogs") ||
      cats.has("question_blogs") ||
      cats.has("package_specific") ||
      cats.has("high_priority"),
    includeQuestions: cats.has("question_blogs"),
    includeComparison: cats.has("comparison_blogs"),
    includePrice: cats.has("money_keywords"),
    includeSeasonal: cats.has("seasonal_blogs"),
    includeSuggest:
      cats.has("google_suggest") && input.includeSuggest !== false,
    // Keep master "Include local search" independent; location_pages filters angles.
    includeLocal: Boolean(input.includeLocal),
  };
}

function cleanBase(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, 80);
}

const LOCATION_PLACES = [
  "North Goa",
  "South Goa",
  "Baga",
  "Calangute",
  "Candolim",
  "Anjuna",
  "Vagator",
  "Palolem",
  "Colva",
  "Grande Island",
  "Dona Paula",
  "Panjim",
] as const;

const NEARBY_ACTIVITIES = [
  "parasailing",
  "jet ski",
  "banana boat",
  "bumper ride",
  "dolphin trip",
  "snorkeling",
  "kayaking",
  "flyboarding",
  "boat cruise",
  "island hopping",
] as const;

/**
 * Seed keywords for each selected research category (complements Ads/GSC/local).
 */
export function buildResearchCategoryIdeas(
  input: ResearchInput,
): RawKeywordIdea[] {
  const cats = new Set(
    input.researchCategories?.length
      ? input.researchCategories
      : ALL_RESEARCH_CATEGORY_IDS,
  );
  const base = cleanBase(input.seedKeyword || input.serviceName);
  if (!base) return [];

  const variants = new Set<string>();

  if (cats.has("high_priority")) {
    for (const k of [
      `book ${base} in Goa`,
      `book ${base} online Goa`,
      `best ${base} in Goa`,
      `top ${base} in Goa`,
      `${base} booking Goa`,
      `hire ${base} in Goa`,
      `${base} Goa same day booking`,
      `best place for ${base} booking`,
    ]) {
      variants.add(k);
    }
  }

  if (cats.has("location_pages")) {
    for (const place of LOCATION_PLACES) {
      variants.add(`${base} in ${place}`);
      variants.add(`best ${base} in ${place}`);
      variants.add(`${base} ${place} package`);
    }
    variants.add(`${base} beach Goa`);
    variants.add(`${base} island Goa`);
  }

  if (cats.has("question_blogs")) {
    for (const k of [
      `how much does ${base} cost in Goa`,
      `is ${base} safe in Goa`,
      `how to book ${base} in Goa`,
      `what to wear for ${base} in Goa`,
      `can non swimmers do ${base} in Goa`,
      `do I need license for ${base} in Goa`,
      `how long is ${base} in Goa`,
      `what is included in ${base} Goa`,
    ]) {
      variants.add(k);
    }
  }

  if (cats.has("comparison_blogs")) {
    for (const k of [
      `${base} vs snorkeling Goa`,
      `Grande Island vs Bat Island ${base}`,
      `North Goa vs South Goa ${base}`,
      `best ${base} package vs cheap option Goa`,
      `${base} or dolphin trip Goa which is better`,
      `PADI vs Discover Scuba Goa`,
    ]) {
      variants.add(k);
    }
  }

  if (cats.has("seasonal_blogs")) {
    for (const k of [
      `best time for ${base} in Goa`,
      `best month for ${base} in Goa`,
      `${base} in Goa in monsoon`,
      `${base} in Goa in December`,
      `${base} in Goa in winter`,
      `${base} Goa season guide`,
      `is ${base} open in rainy season Goa`,
    ]) {
      variants.add(k);
    }
  }

  if (cats.has("money_keywords")) {
    for (const k of [
      `${base} price in Goa`,
      `${base} cost in Goa`,
      `${base} charges Goa`,
      `cheap ${base} in Goa`,
      `${base} package price Goa`,
      `${base} Goa price list`,
      `budget ${base} Goa`,
      `${base} Goa GST price`,
    ]) {
      variants.add(k);
    }
  }

  if (cats.has("experience_blogs")) {
    for (const k of [
      `${base} experience in Goa`,
      `what to expect ${base} Goa`,
      `first time ${base} in Goa`,
      `${base} for beginners Goa`,
      `${base} Goa review experience`,
      `${base} underwater experience Goa`,
      `${base} with photos Goa`,
    ]) {
      variants.add(k);
    }
  }

  if (cats.has("package_specific")) {
    for (const k of [
      `${base} package Goa`,
      `${base} packages with pickup`,
      `${base} combo package Goa`,
      `${base} family package Goa`,
      `${base} couple package Goa`,
      `${base} inclusions exclusions Goa`,
      `${base} full day package Goa`,
      `Grande Island ${base} package`,
    ]) {
      variants.add(k);
    }
  }

  if (cats.has("nearby_activities")) {
    for (const act of NEARBY_ACTIVITIES) {
      variants.add(`${base} and ${act} Goa`);
      variants.add(`${act} near ${base} Goa`);
    }
    for (const k of [
      `things to do near ${base} Goa`,
      `activities near ${base} in Goa`,
      `water sports near ${base} Goa`,
      `what to do after ${base} in Goa`,
    ]) {
      variants.add(k);
    }
  }

  return [...variants]
    .map((keyword) => keyword.replace(/\s+/g, " ").trim())
    .filter((keyword) => keyword.length >= 6)
    .map((keyword) => ({
      keyword,
      source: "template" as const,
      monthlySearches: null,
      competition: "medium" as const,
      serviceSlug: input.serviceSlug,
    }));
}

const CONTENT_CATEGORY_IDS: ResearchCategoryId[] =
  ALL_RESEARCH_CATEGORY_IDS.filter((id) => id !== "google_suggest");

/** Keep a keyword if it matches any selected research category. */
export function matchesSelectedResearchCategories(
  kw: ClassifiedKeyword,
  categories: ResearchCategoryId[],
): boolean {
  const cats = categories.length ? categories : ALL_RESEARCH_CATEGORY_IDS;
  // Google Suggest is a source toggle, not a content filter.
  const contentCats = cats.filter((c) => c !== "google_suggest");
  if (contentCats.length === 0) return true;
  // All content angles selected → keep everything from providers.
  if (contentCats.length >= CONTENT_CATEGORY_IDS.length) return true;

  const t = `${kw.displayKeyword} ${kw.normalizedKeyword}`.toLowerCase();
  const selected = new Set(contentCats);

  if (
    selected.has("high_priority") &&
    (kw.intent === "commercial" ||
      kw.intent === "transactional" ||
      kw.intent === "informational" ||
      /\b(book|booking|best|top|hire|reserve)\b/.test(t))
  ) {
    return true;
  }
  if (
    selected.has("location_pages") &&
    (kw.intent === "local" ||
      kw.contentType === "location_guide" ||
      /\b(baga|calangute|candolim|anjuna|vagator|palolem|colva|north goa|south goa|grande island|dona paula|panjim|beach|island|near me|goa)\b/.test(
        t,
      ))
  ) {
    return true;
  }
  if (
    selected.has("question_blogs") &&
    (kw.intent === "faq" ||
      kw.intent === "safety" ||
      kw.contentType === "faq_article" ||
      /^(how|what|is|can|do|does|should|why)\b/.test(t))
  ) {
    return true;
  }
  if (
    selected.has("comparison_blogs") &&
    (kw.intent === "comparison" ||
      kw.contentType === "comparison" ||
      /\b(vs|versus|or|which is better|compared)\b/.test(t))
  ) {
    return true;
  }
  if (
    selected.has("seasonal_blogs") &&
    (kw.intent === "seasonal" ||
      kw.contentType === "seasonal_guide" ||
      /\b(best time|best month|season|monsoon|winter|summer|december|january|november)\b/.test(
        t,
      ))
  ) {
    return true;
  }
  if (
    selected.has("money_keywords") &&
    (kw.intent === "price" ||
      kw.contentType === "price_guide" ||
      /\b(price|cost|charges|cheap|budget|fee|rupees|₹|gst)\b/.test(t))
  ) {
    return true;
  }
  if (
    selected.has("experience_blogs") &&
    (kw.intent === "beginner" ||
      kw.intent === "informational" ||
      kw.contentType === "what_to_expect" ||
      kw.contentType === "beginner_guide" ||
      /\b(experience|what to expect|first time|beginner|underwater|photos)\b/.test(
        t,
      ))
  ) {
    return true;
  }
  if (
    selected.has("package_specific") &&
    (kw.contentType === "package_guide" ||
      /\b(package|packages|combo|inclusions|exclusions|deal|offer)\b/.test(t))
  ) {
    return true;
  }
  if (
    selected.has("nearby_activities") &&
    /\b(nearby|near me|things to do|parasailing|jet ski|banana|dolphin|snorkeling|kayak|flyboard|water sports|activities near)\b/.test(
      t,
    )
  ) {
    return true;
  }
  return false;
}
