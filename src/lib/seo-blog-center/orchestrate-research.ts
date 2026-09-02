import { getAllBlogPostsMerged } from "@/lib/blog-posts-unified";
import { listDrafts, listKeywords } from "@/lib/seo-blog-center/store";
import { inferCategory } from "@/lib/seo-blog-center/utils";
import { buildKeywordClusters } from "@/lib/seo-blog-center/cluster-keywords";
import { normalizeAndClassifyIdeas } from "@/lib/seo-blog-center/normalize-keywords";
import { scoreKeywordOpportunity } from "@/lib/seo-blog-center/opportunity-score";
import { keywordMatchesSelectedService } from "@/lib/seo-blog-center/service-keyword-context";
import { fetchGoogleAdsKeywordIdeas } from "@/lib/seo-blog-center/providers/google-ads";
import { fetchGscKeywordIdeas } from "@/lib/seo-blog-center/providers/gsc";
import { fetchSuggestAndSeedIdeas } from "@/lib/seo-blog-center/providers/suggest-seed";
import type { ResearchInput } from "@/lib/seo-blog-center/providers/types";
import {
  ALL_RESEARCH_CATEGORY_IDS,
  applyResearchCategoryFlags,
  buildResearchCategoryIdeas,
  matchesSelectedResearchCategories,
} from "@/lib/seo-blog-center/research-categories";
import type {
  SeoBlogKeyword,
  SeoKeywordCluster,
} from "@/lib/seo-blog-center/types";

export type ResearchResult = {
  researchJobId: string;
  keywords: SeoBlogKeyword[];
  clusters: SeoKeywordCluster[];
  providers: { name: string; configured: boolean; count: number; error?: string }[];
  cappedAt: number;
};

export async function runKeywordResearch(
  rawInput: ResearchInput,
): Promise<ResearchResult> {
  const input = applyResearchCategoryFlags({
    ...rawInput,
    researchCategories:
      rawInput.researchCategories?.length
        ? rawInput.researchCategories
        : [...ALL_RESEARCH_CATEGORY_IDS],
  });
  const max = Math.min(250, Math.max(1, input.maxKeywords || 250));
  const researchJobId = `research_${Date.now().toString(36)}`;
  const exclude = new Set<string>();

  if (input.excludeCovered) {
    const [existingKw, drafts, posts] = await Promise.all([
      listKeywords(undefined, 500),
      listDrafts(undefined, 200),
      getAllBlogPostsMerged(),
    ]);
    for (const k of existingKw) exclude.add(k.keyword.toLowerCase().trim());
    for (const d of drafts) exclude.add(d.keyword.toLowerCase().trim());
    for (const p of posts) {
      for (const kw of p.keywords) exclude.add(kw.toLowerCase().trim());
      exclude.add(p.title.toLowerCase().trim());
    }
  }

  const providerReports: ResearchResult["providers"] = [];
  const rawIdeas = [];

  if (input.includeAds) {
    const ads = await fetchGoogleAdsKeywordIdeas(input);
    providerReports.push({
      name: ads.provider,
      configured: ads.configured,
      count: ads.ideas.length,
      error: ads.error,
    });
    rawIdeas.push(...ads.ideas);
  } else {
    providerReports.push({
      name: "google_ads",
      configured: false,
      count: 0,
      error: "Disabled in research form",
    });
  }

  const gsc = await fetchGscKeywordIdeas(input, exclude);
  providerReports.push({
    name: gsc.provider,
    configured: gsc.configured,
    count: gsc.ideas.length,
    error: gsc.error,
  });
  rawIdeas.push(...gsc.ideas);

  const { fetchLocalSearchIdeas } = await import(
    "@/lib/seo-blog-center/providers/local-search"
  );
  const local = await fetchLocalSearchIdeas(input);
  providerReports.push({
    name: local.provider,
    configured: local.configured,
    count: local.ideas.length,
    error: local.error,
  });
  rawIdeas.push(...local.ideas);

  const seeds = await fetchSuggestAndSeedIdeas(input, exclude);
  providerReports.push({
    name: seeds.provider,
    configured: seeds.configured,
    count: seeds.ideas.length,
    error: seeds.error,
  });
  rawIdeas.push(...seeds.ideas);

  const categoryIdeas = buildResearchCategoryIdeas(input);
  providerReports.push({
    name: "research_categories",
    configured: true,
    count: categoryIdeas.length,
    error: undefined,
  });
  rawIdeas.push(...categoryIdeas);

  const classified = normalizeAndClassifyIdeas(rawIdeas)
    .filter((k) => keywordMatchesSelectedService(k.displayKeyword, input))
    .filter((k) => {
    if (input.minMonthlySearches > 0 && k.monthlySearches != null) {
      return k.monthlySearches >= input.minMonthlySearches;
    }
    return true;
  });

  const posts = await getAllBlogPostsMerged();
  const existingTitles = posts.map((p) => p.title);
  const existingKeywords = posts.flatMap((p) => p.keywords);
  const existingKwDocs = await listKeywords(undefined, 300);
  existingKeywords.push(...existingKwDocs.map((k) => k.keyword));

  const scored = classified
    .map((k) =>
      scoreKeywordOpportunity(k, {
        serviceName: input.serviceName,
        seedKeyword: input.seedKeyword,
        serviceSlug: input.serviceSlug,
        existingTitles,
        existingKeywords,
      }),
    )
    .filter((k) => {
      if (!input.includeCommercial && k.intent === "commercial") return false;
      if (!input.includeInformational && k.intent === "informational") return false;
      if (!input.includeLocal && k.intent === "local") return false;
      if (!input.includeQuestions && (k.intent === "faq" || k.intent === "safety"))
        return false;
      if (!input.includeComparison && k.intent === "comparison") return false;
      if (!input.includePrice && k.intent === "price") return false;
      if (!input.includeSeasonal && k.intent === "seasonal") return false;
      if (
        !matchesSelectedResearchCategories(
          k,
          input.researchCategories ?? ALL_RESEARCH_CATEGORY_IDS,
        )
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .slice(0, max);

  const now = new Date().toISOString();
  const keywords: SeoBlogKeyword[] = scored.map((s, i) => ({
    id: `kw_${researchJobId}_${i}`,
    keyword: s.displayKeyword,
    displayKeyword: s.displayKeyword,
    normalizedKeyword: s.normalizedKeyword,
    searchVolume: s.searchVolume,
    monthlySearches: s.monthlySearches ?? null,
    competition: s.competition ?? "medium",
    competitionIndex: s.competitionIndex ?? null,
    cpcLow: s.cpcLow ?? null,
    cpcHigh: s.cpcHigh ?? null,
    trendScore: Math.min(100, s.opportunityScore),
    category: inferCategory(s.displayKeyword),
    seoScore: s.seoScore,
    opportunityScore: s.opportunityScore,
    scoreExplanation: s.scoreExplanation,
    intent: s.intent,
    contentType: s.contentType,
    cannibalizationRisk: s.cannibalizationRisk,
    suggestedAction: s.suggestedAction,
    serviceSlug: s.serviceSlug || input.serviceSlug,
    language: input.language,
    status:
      s.suggestedAction === "optimize_existing"
        ? "needs_optimization"
        : s.cannibalizationRisk === "high"
          ? "already_covered"
          : "pending",
    source: s.source,
    gscClicks: s.gscClicks ?? null,
    gscImpressions: s.gscImpressions ?? null,
    gscCtr: s.gscCtr ?? null,
    gscPosition: s.gscPosition ?? null,
    researchJobId,
    createdAt: now,
    updatedAt: now,
  }));

  const clusters = buildKeywordClusters(scored, {
    researchJobId,
    serviceSlug: input.serviceSlug,
    location: [input.city, input.state, input.country].filter(Boolean).join(", "),
    language: input.language,
    existingUrls: posts.map((p) => `/blog/${p.slug}`),
  });

  // Link keyword ids into clusters by normalized match
  for (const cluster of clusters) {
    const ids: string[] = [];
    for (const kw of keywords) {
      const all = [
        cluster.primaryKeyword,
        ...cluster.secondaryKeywords,
        ...cluster.questionKeywords,
      ].map((x) => x.toLowerCase());
      if (all.includes(kw.keyword.toLowerCase())) {
        ids.push(kw.id);
        kw.clusterId = cluster.id;
      }
    }
    cluster.keywordIds = ids;
    const primary = keywords.find(
      (k) => k.keyword.toLowerCase() === cluster.primaryKeyword.toLowerCase(),
    );
    cluster.primaryKeywordId = primary?.id;
  }

  return {
    researchJobId,
    keywords,
    clusters,
    providers: providerReports,
    cappedAt: max,
  };
}
