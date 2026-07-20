import { discoverGscKeywords } from "@/lib/seo-blog-center/gsc-keywords";
import type { ProviderResult, ResearchInput } from "./types";

export async function fetchGscKeywordIdeas(
  input: ResearchInput,
  exclude: Set<string>,
): Promise<ProviderResult> {
  if (!input.includeGsc) {
    return { configured: true, ideas: [], provider: "gsc" };
  }
  try {
    const limit = Math.min(40, input.maxKeywords);
    const result = await discoverGscKeywords(exclude, limit);
    const ideas = result.keywords.map((k) => ({
      keyword: k.keyword,
      source: "gsc" as const,
      monthlySearches: k.gscImpressions ?? null,
      competition: k.competition,
      gscClicks: k.gscClicks,
      gscImpressions: k.gscImpressions,
      gscCtr: k.gscCtr,
      gscPosition: k.gscPosition,
      serviceSlug: input.serviceSlug,
    }));
    return {
      configured: true,
      ideas,
      provider: "gsc",
      error: result.error,
    };
  } catch (e) {
    return {
      configured: true,
      ideas: [],
      provider: "gsc",
      error: e instanceof Error ? e.message : "GSC failed",
    };
  }
}
