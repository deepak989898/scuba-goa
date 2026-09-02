import type { ProviderResult, RawKeywordIdea, ResearchInput } from "./types";
import { isScubaService } from "@/lib/seo-blog-center/service-keyword-context";

/** Popular Goa / coastal places for local SEO modifiers. */
export const GOA_LOCAL_PLACES = [
  "Goa",
  "North Goa",
  "South Goa",
  "Baga",
  "Calangute",
  "Candolim",
  "Anjuna",
  "Vagator",
  "Morjim",
  "Ashwem",
  "Arambol",
  "Palolem",
  "Colva",
  "Benaulim",
  "Agonda",
  "Grande Island",
  "Grand Island",
  "St George Island",
  "Bat Island",
  "Dona Paula",
  "Panjim",
  "Panaji",
  "Mapusa",
  "Vasco",
  "Miramar",
  "Sinquerim",
  "Chapora",
  "Assagao",
  "Siolim",
  "Betalbatim",
  "Majorda",
  "Cavelossim",
  "Mobor",
  "Patnem",
] as const;

const LOCAL_QUERY_TEMPLATES = [
  "{base} in {place}",
  "{base} {place}",
  "best {base} in {place}",
  "{base} near {place}",
  "{base} package in {place}",
  "{base} price in {place}",
  "{base} from {place}",
  "book {base} in {place}",
];

const NEAR_ME_TEMPLATES = [
  "{base} near me",
  "{base} near me in Goa",
  "{base} close to me",
  "{base} nearby",
  "best {base} near me",
  "{base} near my hotel",
  "{base} near my location",
  "{base} how much far from my location",
  "{base} how far from my location",
  "{base} distance from my location",
  "{base} pickup near me",
  "{base} with hotel pickup near me",
];

function cleanBase(raw: string): string {
  let s = raw.replace(/\s+/g, " ").trim().slice(0, 80);
  s = s.replace(/\s+in\s+goa$/i, "").trim();
  return s;
}

/**
 * Expand seed/service into local SEO keyword possibilities
 * (beaches, islands, near me, distance queries).
 */
export function buildLocalSearchIdeas(input: ResearchInput): RawKeywordIdea[] {
  if (!input.includeLocal) return [];

  const base = cleanBase(input.seedKeyword || input.serviceName);
  if (!base) return [];

  const variants = new Set<string>();

  for (const place of GOA_LOCAL_PLACES) {
    for (const tpl of LOCAL_QUERY_TEMPLATES) {
      variants.add(
        tpl.replace(/\{base\}/g, base).replace(/\{place\}/g, place),
      );
    }
  }

  for (const tpl of NEAR_ME_TEMPLATES) {
    variants.add(tpl.replace(/\{base\}/g, base));
  }

  // Extra high-intent local patterns
  const extras = [
    `${base} in Goa for beginners`,
    `${base} in Goa with hotel pickup`,
    `${base} Baga beach`,
    `${base} Calangute beach`,
    `${base} from Mumbai`,
    `${base} from Pune`,
    `${base} from Bangalore`,
    `${base} weekend trip Goa`,
    `where to do ${base} in Goa`,
    `best place for ${base} in Goa`,
  ];
  if (isScubaService(input)) {
    extras.push(`${base} Grande Island package`);
  }
  for (const e of extras) variants.add(e);

  if (input.city?.trim()) {
    const city = input.city.trim();
    variants.add(`${base} in ${city}`);
    variants.add(`${base} near ${city}`);
    variants.add(`${base} from ${city}`);
  }

  return [...variants]
    .map((keyword) => keyword.replace(/\s+/g, " ").trim())
    .filter((keyword) => keyword.length >= 6)
    .map((keyword) => ({
      keyword,
      source: "local_seed" as const,
      monthlySearches: null,
      competition: "medium" as const,
      serviceSlug: input.serviceSlug,
    }));
}

export async function fetchLocalSearchIdeas(
  input: ResearchInput,
): Promise<ProviderResult> {
  if (!input.includeLocal) {
    return { configured: true, ideas: [], provider: "local_search" };
  }
  const ideas = buildLocalSearchIdeas(input);
  return {
    configured: true,
    ideas,
    provider: "local_search",
  };
}
