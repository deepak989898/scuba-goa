import type { KeywordCategory, SeoBlogKeyword } from "@/lib/seo-blog-center/types";
import {
  buildScubaSeedQueries,
  fetchGoogleSuggestQueries,
  fetchSerpRelatedSearches,
} from "@/lib/seo-blog-center/google-suggest";
import { computeSeoScore, inferCategory, slugify } from "@/lib/seo-blog-center/utils";

const GOA_LOCATIONS = [
  "Goa",
  "Baga",
  "Calangute",
  "Candolim",
  "Anjuna",
  "Vagator",
  "Palolem",
  "Colva",
  "Grande Island",
  "North Goa",
  "South Goa",
];

const ORIGIN_CITIES = [
  "Mumbai",
  "Delhi",
  "Bangalore",
  "Pune",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Ahmedabad",
  "Jaipur",
  "Chandigarh",
  "Lucknow",
  "Indore",
];

const TEMPLATES: Record<KeywordCategory, (ctx: { loc: string; city: string }) => string[]> = {
  scuba_diving: (ctx) => [
    `scuba diving in ${ctx.loc}`,
    `scuba diving price in ${ctx.loc}`,
    `best scuba diving ${ctx.loc}`,
    `book scuba diving ${ctx.loc}`,
    `padi scuba diving ${ctx.loc}`,
    `beginner scuba diving ${ctx.loc}`,
    `scuba diving packages ${ctx.loc}`,
  ],
  water_sports: (ctx) => [
    `water sports in ${ctx.loc}`,
    `parasailing ${ctx.loc} price`,
    `jet ski ${ctx.loc}`,
    `banana boat ride ${ctx.loc}`,
  ],
  goa_beaches: (ctx) => [
    `best beaches in ${ctx.loc}`,
    `things to do ${ctx.loc}`,
    `${ctx.loc} beach guide`,
  ],
  island_trips: (ctx) => [
    `grande island trip ${ctx.loc}`,
    `island scuba diving ${ctx.loc}`,
    `boat trip grande island goa`,
  ],
  travel_guides: (ctx) => [
    `best time for scuba diving ${ctx.loc}`,
    `scuba diving safety tips ${ctx.loc}`,
    `what to expect scuba diving ${ctx.loc}`,
    `scuba diving for beginners ${ctx.loc}`,
  ],
  booking_pricing: (ctx) => [
    `scuba diving cost ${ctx.loc}`,
    `cheap scuba diving ${ctx.loc}`,
    `scuba diving booking ${ctx.loc}`,
    `scuba diving offers ${ctx.loc}`,
  ],
  city_origin: (ctx) => [
    `scuba diving goa from ${ctx.city}`,
    `${ctx.city} to goa scuba diving package`,
    `goa scuba trip from ${ctx.city}`,
    `book scuba goa from ${ctx.city}`,
  ],
};

function hashKeyword(keyword: string): number {
  let h = 0;
  for (let i = 0; i < keyword.length; i++) h = (h << 5) - h + keyword.charCodeAt(i);
  return Math.abs(h);
}

function buildRecord(
  keyword: string,
  source: SeoBlogKeyword["source"],
  originCity?: string,
): SeoBlogKeyword {
  const seed = hashKeyword(keyword);
  const searchVolume = 800 + (seed % 9200);
  const competition =
    seed % 3 === 0 ? "low" : seed % 3 === 1 ? "medium" : ("high" as const);
  const trendScore = 40 + (seed % 60);
  const now = new Date().toISOString();
  const category = inferCategory(keyword);

  return {
    id: `kw_${slugify(keyword)}_${seed.toString(36).slice(0, 6)}`,
    keyword: keyword.trim(),
    searchVolume,
    competition,
    trendScore,
    category,
    destination: keyword.toLowerCase().includes("goa") ? "Goa" : GOA_LOCATIONS[0],
    originCity,
    seoScore: computeSeoScore({ searchVolume, competition, trendScore }),
    status: "pending",
    source,
    createdAt: now,
  };
}

function buildTemplatePool(excludeSet: Set<string>): SeoBlogKeyword[] {
  const out: SeoBlogKeyword[] = [];
  const seen = new Set(excludeSet);

  for (const loc of GOA_LOCATIONS) {
    const categories = Object.keys(TEMPLATES) as KeywordCategory[];
    for (const cat of categories) {
      if (cat === "city_origin") continue;
      for (const phrase of TEMPLATES[cat]({ loc, city: "" })) {
        const key = phrase.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(buildRecord(phrase, "template"));
      }
    }
  }

  for (const city of ORIGIN_CITIES) {
    for (const phrase of TEMPLATES.city_origin({ loc: "Goa", city })) {
      const key = phrase.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const rec = buildRecord(phrase, "template", city);
      rec.category = "city_origin";
      out.push(rec);
    }
  }

  return out.sort((a, b) => b.seoScore - a.seoScore);
}

export async function discoverGoogleSuggestKeywords(
  excludeSet: Set<string>,
  maxResults = 20,
): Promise<SeoBlogKeyword[]> {
  const seeds = buildScubaSeedQueries();
  const seen = new Set(excludeSet);
  const collected: SeoBlogKeyword[] = [];

  for (const seed of seeds.slice(0, 12)) {
    if (collected.length >= maxResults) break;
    const suggestions = await fetchGoogleSuggestQueries(seed);
    for (const s of suggestions) {
      const key = s.toLowerCase();
      if (seen.has(key) || key.length < 4) continue;
      if (!/scuba|diving|goa|snorkel|water|island|beach|underwater|padi|boat|parasail/.test(key)) {
        continue;
      }
      seen.add(key);
      collected.push(buildRecord(s, "google_suggest"));
      if (collected.length >= maxResults) break;
    }
  }

  const serpKey = process.env.SERPER_API_KEY?.trim() || process.env.SERP_API_KEY?.trim();
  if (serpKey && collected.length < maxResults) {
    for (const seed of seeds.slice(0, 4)) {
      const related = await fetchSerpRelatedSearches(seed);
      for (const phrase of related) {
        const key = phrase.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        collected.push(buildRecord(phrase, "google_serp"));
        if (collected.length >= maxResults) break;
      }
    }
  }

  return collected.sort((a, b) => b.seoScore - a.seoScore).slice(0, maxResults);
}

export function discoverTemplateKeywords(
  excludeSet: Set<string>,
  maxResults = 20,
): SeoBlogKeyword[] {
  return buildTemplatePool(excludeSet).slice(0, maxResults);
}

export { ORIGIN_CITIES, GOA_LOCATIONS };
