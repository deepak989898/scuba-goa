import {
  discoverGoogleSuggestKeywords,
  discoverTemplateKeywords,
} from "@/lib/seo-blog-center/keyword-agent";
import type { ProviderResult, RawKeywordIdea, ResearchInput } from "./types";

const INTENT_SUFFIXES: Record<string, string[]> = {
  price: ["price", "cost", "charges", "package price"],
  safety: ["safe", "safety", "is it safe"],
  beginner: ["for beginners", "first time", "non swimmers"],
  seasonal: ["best time", "best month", "season"],
  comparison: ["vs", "or", "best"],
  question: ["how much", "what is", "how to"],
  local: ["Goa", "North Goa", "Baga", "Calangute"],
};

function buildServiceSeeds(input: ResearchInput): RawKeywordIdea[] {
  const base = (input.seedKeyword || input.serviceName).trim();
  if (!base) return [];
  const variants: string[] = [
    base,
    `${base} in Goa`,
    `best ${base} in Goa`,
    `${base} Goa packages`,
  ];
  if (input.includePrice) {
    for (const s of INTENT_SUFFIXES.price) variants.push(`${base} ${s} Goa`);
  }
  if (input.includeQuestions) {
    for (const s of INTENT_SUFFIXES.question) variants.push(`${s} ${base} in Goa`);
  }
  if (input.includeSeasonal) {
    for (const s of INTENT_SUFFIXES.seasonal) variants.push(`${s} for ${base} in Goa`);
  }
  if (input.includeComparison) {
    variants.push(`best ${base} packages Goa`);
  }
  if (input.includeLocal && input.city) {
    variants.push(`${base} ${input.city}`);
    variants.push(`${base} in ${input.city}`);
    variants.push(`${base} near ${input.city}`);
  }
  // Broader local patterns live in providers/local-search.ts when includeLocal is on.

  return [...new Set(variants.map((v) => v.replace(/\s+/g, " ").trim()))].map(
    (keyword) => ({
      keyword,
      source: "service_seed" as const,
      monthlySearches: null,
      competition: "medium" as const,
      serviceSlug: input.serviceSlug,
    }),
  );
}

export async function fetchSuggestAndSeedIdeas(
  input: ResearchInput,
  exclude: Set<string>,
): Promise<ProviderResult> {
  const ideas: RawKeywordIdea[] = [...buildServiceSeeds(input)];

  if (input.includeSuggest) {
    try {
      const suggest = await discoverGoogleSuggestKeywords(exclude, 30);
      for (const k of suggest) {
        ideas.push({
          keyword: k.keyword,
          source: "google_suggest",
          monthlySearches: null,
          competition: k.competition,
          serviceSlug: input.serviceSlug,
        });
      }
    } catch {
      /* optional */
    }
  }

  const templates = discoverTemplateKeywords(exclude, 20);
  for (const k of templates) {
    ideas.push({
      keyword: k.keyword,
      source: "template",
      monthlySearches: null,
      competition: k.competition,
      serviceSlug: input.serviceSlug,
    });
  }

  return { configured: true, ideas, provider: "suggest_seed" };
}
