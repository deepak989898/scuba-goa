import {
  buildScubaSeedQueries,
  fetchGoogleSuggestQueries,
  fetchSerpRelatedSearches,
} from "@/lib/seo-blog-center/google-suggest";
import type { SeoBlogKeyword } from "@/lib/seo-blog-center/types";
import { computeSeoScore, inferCategory, slugify } from "@/lib/seo-blog-center/utils";

const ORIGIN_CITIES_FOR_ROUTES = [
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
  "Kochi",
  "Nagpur",
  "Surat",
];

function hashKeyword(keyword: string): number {
  let h = 0;
  for (let i = 0; i < keyword.length; i++) h = (h << 5) - h + keyword.charCodeAt(i);
  return Math.abs(h);
}

function titleCaseCity(city: string): string {
  return city
    .trim()
    .split(/\s+/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
}

function buildCityRecord(keyword: string, originCity: string): SeoBlogKeyword {
  const seed = hashKeyword(`${originCity}:${keyword}`);
  const searchVolume = 500 + (seed % 8500);
  const competition =
    seed % 4 === 0 ? "low" : seed % 4 === 1 ? "medium" : ("high" as const);
  const trendScore = 42 + (seed % 55);
  const now = new Date().toISOString();

  return {
    id: `kw_city_${slugify(originCity)}_${slugify(keyword)}_${seed.toString(36).slice(0, 5)}`,
    keyword: keyword.trim(),
    searchVolume,
    competition,
    trendScore,
    category: inferCategory(keyword),
    destination: "Goa",
    originCity,
    seoScore: computeSeoScore({ searchVolume, competition, trendScore }),
    status: "pending",
    source: "city_research",
    createdAt: now,
  };
}

function buildCityTemplatePhrases(city: string): string[] {
  const phrases: string[] = [
    `scuba diving goa from ${city}`,
    `goa scuba diving package from ${city}`,
    `${city} to goa scuba trip`,
    `book scuba diving goa from ${city}`,
    `goa water sports from ${city}`,
    `goa adventure trip from ${city}`,
    `weekend scuba goa from ${city}`,
    `honeymoon scuba diving goa from ${city}`,
    `family scuba diving goa from ${city}`,
    `cheap scuba diving goa from ${city}`,
    `best scuba diving goa from ${city}`,
    `grande island scuba from ${city}`,
    `snorkeling goa from ${city}`,
    `parasailing goa from ${city}`,
    `goa island trip from ${city}`,
    `scuba diving price goa from ${city}`,
    `goa scuba diving booking from ${city}`,
    `first time scuba goa from ${city}`,
    `padi scuba course goa from ${city}`,
    `underwater diving goa from ${city}`,
  ];

  for (const dest of ["Goa", "North Goa", "South Goa", "Baga", "Palolem"]) {
    if (dest.toLowerCase() === city.toLowerCase()) continue;
    phrases.push(
      `${city} to ${dest} scuba diving`,
      `scuba diving package ${city} to ${dest}`,
      `water sports ${city} to goa`,
    );
  }

  return phrases;
}

export async function generateCityKeywordResearch(
  cityInput: string,
  limit = 80,
  existingKeywords: string[] = [],
): Promise<{ city: string; keywords: SeoBlogKeyword[]; duplicatesSkipped: number }> {
  const city = titleCaseCity(cityInput);
  if (!city || city.length < 2) {
    return { city: "", keywords: [], duplicatesSkipped: 0 };
  }

  const exclude = new Set(existingKeywords.map((k) => k.toLowerCase().trim()));
  const seen = new Set<string>();
  const collected: SeoBlogKeyword[] = [];

  for (const phrase of buildCityTemplatePhrases(city)) {
    const key = phrase.toLowerCase();
    if (exclude.has(key) || seen.has(key)) continue;
    seen.add(key);
    collected.push(buildCityRecord(phrase, city));
  }

  const suggestSeeds = [
    `scuba diving goa from ${city}`,
    `${city} to goa scuba`,
    `goa water sports from ${city}`,
    `book scuba goa ${city}`,
  ];

  for (const seed of suggestSeeds) {
    const suggestions = await fetchGoogleSuggestQueries(seed);
    for (const s of suggestions) {
      const key = s.toLowerCase();
      if (!key.includes("goa") && !key.includes("scuba") && !key.includes("diving")) continue;
      if (exclude.has(key) || seen.has(key)) continue;
      seen.add(key);
      collected.push(buildCityRecord(s, city));
    }
  }

  const serpKey = process.env.SERPER_API_KEY?.trim() || process.env.SERP_API_KEY?.trim();
  if (serpKey) {
    const related = await fetchSerpRelatedSearches(`scuba diving goa from ${city}`);
    for (const phrase of related) {
      const key = phrase.toLowerCase();
      if (exclude.has(key) || seen.has(key)) continue;
      seen.add(key);
      collected.push(buildCityRecord(phrase, city));
    }
  }

  collected.sort((a, b) => b.seoScore - a.seoScore);
  const sliced = collected.slice(0, limit);
  const duplicatesSkipped = collected.length - sliced.length;

  return { city, keywords: sliced, duplicatesSkipped };
}

export { ORIGIN_CITIES_FOR_ROUTES };
