import { createSerperProvider } from "./serper-provider";
import type {
  SerpKeywordMetrics,
  SerpOrganicResult,
  SerpProvider,
  SerpSearchResult,
} from "./serp-types";

export type {
  SerpKeywordMetrics,
  SerpOrganicResult,
  SerpProvider,
  SerpSearchResult,
} from "./serp-types";

function createNoneProvider(): SerpProvider {
  const emptySearch = (keyword: string): SerpSearchResult => ({
    keyword,
    organic: [],
    relatedSearches: [],
    peopleAlsoAsk: [],
    configured: false,
    provider: "none",
    error: "No SERP provider configured. Set SERPER_API_KEY (or SERP_API_KEY).",
  });

  return {
    name: "none",
    isConfigured: () => false,
    searchKeyword: async (keyword) => emptySearch(keyword),
    getTopResults: async () => [] as SerpOrganicResult[],
    getKeywordMetrics: async (keyword): Promise<SerpKeywordMetrics> => ({
      keyword,
      searchVolume: null,
      difficulty: null,
      configured: false,
      provider: "none",
      error: "No SERP provider configured",
    }),
    getCompetitorRankings: async (_keyword, domains) =>
      domains.map((domain) => ({ domain, position: null, url: null })),
  };
}

/**
 * Resolve SERP provider from env. Never throws when unconfigured —
 * callers get configured:false and admin shows setup required.
 */
export function getSerpProvider(): SerpProvider {
  const name = (process.env.SERP_PROVIDER?.trim() || "serper").toLowerCase();
  if (name === "none") return createNoneProvider();
  const serper = createSerperProvider();
  if (serper.isConfigured()) return serper;
  return createNoneProvider();
}
