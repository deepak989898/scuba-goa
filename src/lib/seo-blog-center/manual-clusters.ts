import { getAllBlogPostsMerged } from "@/lib/blog-posts-unified";
import { buildClusterConflicts } from "@/lib/seo-blog-center/cluster-keywords";
import {
  classifyContentType,
  classifyIntent,
  normalizeKeywordKey,
  polishDisplayKeyword,
} from "@/lib/seo-blog-center/normalize-keywords";
import { listClusters, listKeywords } from "@/lib/seo-blog-center/store";
import type { SeoBlogKeyword, SeoKeywordCluster } from "@/lib/seo-blog-center/types";
import { inferCategory, slugify } from "@/lib/seo-blog-center/utils";

const MAX_MANUAL_TITLES = 50;

export type ManualClusterInput = {
  titles: string[];
  serviceSlug: string;
  serviceName?: string;
  language?: "en" | "hi" | "both";
  actorId: string;
  excludeCovered?: boolean;
};

export type ManualClusterSkipped = {
  title: string;
  reason: string;
};

export type ManualClusterResult = {
  researchJobId: string;
  keywords: SeoBlogKeyword[];
  clusters: SeoKeywordCluster[];
  skipped: ManualClusterSkipped[];
};

function parseTitles(raw: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of raw) {
    const title = line.replace(/\s+/g, " ").trim();
    if (!title) continue;
    const key = normalizeKeywordKey(title);
    if (key.length < 3 || seen.has(key)) continue;
    seen.add(key);
    out.push(title);
  }
  return out.slice(0, MAX_MANUAL_TITLES);
}

export async function createManualClustersFromTitles(
  input: ManualClusterInput,
): Promise<ManualClusterResult> {
  const titles = parseTitles(input.titles);
  if (titles.length === 0) {
    return {
      researchJobId: "",
      keywords: [],
      clusters: [],
      skipped: [{ title: "(empty)", reason: "Add at least one valid title (one per line)" }],
    };
  }

  const researchJobId = `manual_${Date.now().toString(36)}`;
  const location = "Goa, India";
  const language = input.language ?? "en";
  const now = new Date().toISOString();

  const [posts, existingKw, existingClusters] = await Promise.all([
    getAllBlogPostsMerged(),
    input.excludeCovered !== false ? listKeywords(undefined, 500) : Promise.resolve([]),
    input.excludeCovered !== false ? listClusters(500) : Promise.resolve([]),
  ]);

  const existingUrls = posts.map((p) => `/blog/${p.slug}`);
  const covered = new Set<string>();
  if (input.excludeCovered !== false) {
    for (const p of posts) {
      covered.add(normalizeKeywordKey(p.title));
      for (const kw of p.keywords) covered.add(normalizeKeywordKey(kw));
    }
    for (const k of existingKw) {
      if (k.status !== "rejected") {
        covered.add(normalizeKeywordKey(k.keyword));
      }
    }
    for (const c of existingClusters) {
      if (c.status !== "rejected") {
        covered.add(normalizeKeywordKey(c.primaryKeyword));
        covered.add(normalizeKeywordKey(c.suggestedTitle));
      }
    }
  }

  const keywords: SeoBlogKeyword[] = [];
  const clusters: SeoKeywordCluster[] = [];
  const skipped: ManualClusterSkipped[] = [];

  for (let i = 0; i < titles.length; i++) {
    const rawTitle = titles[i]!;
    const displayKeyword = polishDisplayKeyword(rawTitle).slice(0, 120);
    const normalized = normalizeKeywordKey(displayKeyword);

    if (normalized.length < 3) {
      skipped.push({ title: rawTitle, reason: "Title too short" });
      continue;
    }

    if (covered.has(normalized)) {
      skipped.push({
        title: displayKeyword,
        reason: "Already covered by an existing blog, keyword, or cluster",
      });
      continue;
    }

    const intent = classifyIntent(displayKeyword);
    const contentType = classifyContentType(intent, displayKeyword);
    const conflicts = buildClusterConflicts(displayKeyword, existingUrls);
    const hasHighConflict = conflicts.some((c) => c.similarityPercent >= 65);
    const keywordId = `kw_${researchJobId}_${i}`;
    const clusterId = `cl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

    const keyword: SeoBlogKeyword = {
      id: keywordId,
      keyword: displayKeyword,
      displayKeyword,
      normalizedKeyword: normalized,
      searchVolume: 0,
      monthlySearches: null,
      competition: "medium",
      competitionIndex: null,
      cpcLow: null,
      cpcHigh: null,
      trendScore: 60,
      category: inferCategory(displayKeyword),
      seoScore: 70,
      opportunityScore: 75,
      scoreExplanation: "Manual title — admin-specified topic",
      intent,
      contentType,
      clusterId,
      cannibalizationRisk: hasHighConflict
        ? "high"
        : conflicts.length > 0
          ? "medium"
          : "none",
      suggestedAction: hasHighConflict ? "optimize_existing" : "create_article",
      serviceSlug: input.serviceSlug,
      language,
      status: "pending",
      source: "manual",
      researchJobId,
      createdAt: now,
      updatedAt: now,
    };

    const cluster: SeoKeywordCluster = {
      id: clusterId,
      researchJobId,
      primaryKeyword: displayKeyword,
      primaryKeywordId: keywordId,
      secondaryKeywords: [],
      questionKeywords: intent === "faq" ? [displayKeyword] : [],
      keywordIds: [keywordId],
      intent,
      contentType,
      serviceSlug: input.serviceSlug,
      location,
      language,
      suggestedTitle: displayKeyword.slice(0, 70),
      suggestedSlug: slugify(displayKeyword),
      opportunityScore: 75,
      cannibalizationScore: conflicts.length
        ? Math.max(...conflicts.map((c) => c.similarityPercent))
        : 0,
      conflictingUrls: conflicts.map((c) => c.path),
      conflicts,
      status: hasHighConflict ? "rejected" : "pending",
      isManual: true,
      notes: `Manual title (${input.actorId})`,
      createdAt: now,
      updatedAt: now,
    };

    keywords.push(keyword);
    clusters.push(cluster);
    covered.add(normalized);
  }

  return { researchJobId, keywords, clusters, skipped };
}
