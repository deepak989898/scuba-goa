import { normalizeKeywordKey } from "@/lib/seo-blog-center/normalize-keywords";
import { fetchGoogleSuggestQueries } from "@/lib/seo-blog-center/google-suggest";
import { querySearchAnalytics } from "@/lib/gsc-indexing-agent/gsc-client";
import { getAllServicesServer } from "@/lib/get-services-server";
import { getAllBlogPostsMerged } from "@/lib/blog-posts-unified";
import { listPublishedSeoPagesServer } from "@/lib/seo-pages-server";
import { appendSeoIntelLog } from "./activity-log";
import { normaliseKeyword } from "./domain";
import {
  classifySeoIntelIntent,
  inferCategory,
  inferLocation,
  recommendContentType,
} from "./intent";
import { getKeyword, keywordDocId, upsertKeyword } from "./keywords-store";
import {
  businessValueFromCategory,
  recommendedAction,
  scoreOpportunity,
} from "./opportunity";
import { buildSitePageCorpus } from "./page-corpus";
import { matchKeywordToPages } from "./page-match";
import type { SeoIntelKeyword } from "./types";

const MODIFIERS = [
  "price",
  "cost",
  "booking",
  "package",
  "best",
  "cheap",
  "near me",
  "in Goa",
  "for beginners",
  "for couples",
  "for family",
  "safety",
  "timing",
  "offers",
  "online booking",
  "pickup included",
  "reviews",
  "itinerary",
];

const SEED_TOPICS = [
  "scuba diving in goa",
  "bungee jumping in goa",
  "water sports in goa",
  "flyboarding in goa",
  "goa casino booking",
  "north goa tour",
  "south goa tour",
  "dudhsagar waterfall tour",
  "russian night club in goa",
  "adventure boat party goa",
  "cruise party in goa",
  "parasailing in goa",
  "jet skiing in goa",
  "banana boat ride goa",
  "bumper ride goa",
  "dolphin trip goa",
  "grand island trip goa",
  "snorkeling in goa",
  "goa tour packages",
];

type RawIdea = {
  keyword: string;
  source: string;
  impressions?: number;
  clicks?: number;
  ctr?: number;
  position?: number;
};

function istDateOffset(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function clusterKeywords(keywords: string[]): Map<string, string> {
  /** Map normalised → primary (shortest / most complete seed) */
  const items = [...new Set(keywords.map((k) => normaliseKeyword(k)).filter(Boolean))];
  const assigned = new Map<string, string>();
  const primaries: string[] = [];

  for (const kw of items.sort((a, b) => a.length - b.length)) {
    const tokens = new Set(kw.split(" ").filter((t) => t.length > 2));
    let bestPrimary: string | null = null;
    let best = 0;
    for (const p of primaries) {
      const pt = new Set(p.split(" ").filter((t) => t.length > 2));
      let inter = 0;
      for (const t of tokens) if (pt.has(t)) inter += 1;
      const union = tokens.size + pt.size - inter;
      const j = union ? inter / union : 0;
      if (j >= 0.55 && j > best) {
        best = j;
        bestPrimary = p;
      }
    }
    if (bestPrimary) {
      assigned.set(kw, bestPrimary);
    } else {
      primaries.push(kw);
      assigned.set(kw, kw);
    }
  }
  return assigned;
}

async function collectSeedIdeas(): Promise<RawIdea[]> {
  const ideas: RawIdea[] = [];
  const services = await getAllServicesServer().catch(() => []);
  const blogs = await getAllBlogPostsMerged().catch(() => []);
  const guides = await listPublishedSeoPagesServer().catch(() => []);

  for (const s of services) {
    const base = s.title.toLowerCase().includes("goa")
      ? s.title
      : `${s.title} in Goa`;
    ideas.push({ keyword: base, source: "service" });
    ideas.push({ keyword: `${s.title} price`, source: "service_modifier" });
    ideas.push({ keyword: `${s.title} booking`, source: "service_modifier" });
  }

  for (const b of blogs.slice(0, 80)) {
    ideas.push({ keyword: b.title, source: "blog_title" });
    for (const k of (b.keywords ?? []).slice(0, 3)) {
      ideas.push({ keyword: k, source: "blog_keyword" });
    }
  }

  for (const g of guides.slice(0, 40)) {
    if (g.headline) ideas.push({ keyword: g.headline, source: "guide" });
  }

  for (const seed of SEED_TOPICS) {
    ideas.push({ keyword: seed, source: "seed_topic" });
    for (const mod of MODIFIERS.slice(0, 8)) {
      if (seed.toLowerCase().includes(mod.toLowerCase())) continue;
      ideas.push({ keyword: `${seed.replace(/\s+in goa$/i, "")} ${mod}`.replace(/\s+/g, " ").trim(), source: "modifier" });
    }
  }

  return ideas;
}

async function collectGscIdeas(): Promise<RawIdea[]> {
  const endDate = istDateOffset(2);
  const startDate = istDateOffset(30);
  const result = await querySearchAnalytics({
    startDate,
    endDate,
    dimensions: ["query"],
    rowLimit: 250,
  });
  if (!result.ok) return [];
  return result.rows
    .filter((r) => r.keys[0] && r.impressions >= 3)
    .map((r) => ({
      keyword: r.keys[0],
      source: "gsc",
      impressions: r.impressions,
      clicks: r.clicks,
      ctr: r.ctr,
      position: r.position,
    }));
}

async function collectSuggestIdeas(seeds: string[]): Promise<RawIdea[]> {
  const ideas: RawIdea[] = [];
  for (const seed of seeds.slice(0, 8)) {
    const suggestions = await fetchGoogleSuggestQueries(seed);
    for (const s of suggestions.slice(0, 6)) {
      ideas.push({ keyword: s, source: "google_suggest" });
    }
  }
  return ideas;
}

/**
 * Discover + upsert keywords with page matching and clustering.
 * Does not call SERP (rank refresh is separate to control API spend).
 */
export async function discoverKeywords(opts?: {
  actor?: string;
  includeSuggest?: boolean;
  maxUpserts?: number;
}): Promise<{
  discovered: number;
  updated: number;
  clusters: number;
  gscQueries: number;
  errors: string[];
}> {
  const actor = opts?.actor ?? "system";
  const errors: string[] = [];
  const maxUpserts = opts?.maxUpserts ?? 250;

  const [seedIdeas, gscIdeas, corpus] = await Promise.all([
    collectSeedIdeas(),
    collectGscIdeas().catch((e) => {
      errors.push(e instanceof Error ? e.message : "GSC query sync failed");
      return [] as RawIdea[];
    }),
    buildSitePageCorpus(),
  ]);

  let suggestIdeas: RawIdea[] = [];
  if (opts?.includeSuggest !== false) {
    suggestIdeas = await collectSuggestIdeas(
      SEED_TOPICS.slice(0, 6),
    ).catch(() => []);
  }

  const merged = new Map<string, RawIdea>();
  for (const idea of [...gscIdeas, ...seedIdeas, ...suggestIdeas]) {
    const key = normalizeKeywordKey(idea.keyword);
    if (key.length < 3 || key.length > 100) continue;
    const prev = merged.get(key);
    if (!prev) {
      merged.set(key, idea);
      continue;
    }
    merged.set(key, {
      ...prev,
      ...idea,
      keyword: (idea.impressions ?? 0) >= (prev.impressions ?? 0) ? idea.keyword : prev.keyword,
      impressions: Math.max(idea.impressions ?? 0, prev.impressions ?? 0) || undefined,
      clicks: Math.max(idea.clicks ?? 0, prev.clicks ?? 0) || undefined,
      source: Array.from(new Set([prev.source, idea.source])).join("+"),
    });
  }

  const clusterMap = clusterKeywords([...merged.values()].map((v) => v.keyword));
  const primarySet = new Set(clusterMap.values());
  let discovered = 0;
  let updated = 0;
  let count = 0;

  for (const idea of merged.values()) {
    if (count >= maxUpserts) break;
    const normalised = normaliseKeyword(idea.keyword);
    const intent = classifySeoIntelIntent(idea.keyword);
    const category = inferCategory(idea.keyword);
    const location = inferLocation(idea.keyword);
    const contentType = recommendContentType(idea.keyword, intent);
    const match = matchKeywordToPages(idea.keyword, corpus, {
      preferType: contentType,
    });
    const businessValueScore = businessValueFromCategory(category, intent);
    const primary = clusterMap.get(normalised) || normalised;
    const opportunityScore = scoreOpportunity({
      myPosition: idea.position ?? null,
      impressions: idea.impressions ?? null,
      clicks: idea.clicks ?? null,
      ctr: idea.ctr ?? null,
      bestCompetitorPosition: null,
      pageMatchStatus: match.status,
      intent,
      businessValueScore,
    });

    const id = keywordDocId(normalised);
    const existed = await getKeyword(id);
    await upsertKeyword({
      keyword: idea.keyword.replace(/\s+/g, " ").trim(),
      normalisedKeyword: normalised,
      clusterId: primary,
      primaryKeyword: primary === normalised ? idea.keyword : primary,
      intent,
      category,
      location,
      searchVolume: null,
      difficulty: null,
      source: idea.source,
      priorityScore: opportunityScore,
      businessValueScore,
      existingPageId: match.pageId,
      existingPageUrl: match.pageUrl,
      existingPageType: match.pageType,
      pageMatchStatus: match.status,
      pageMatchNote: match.note,
      recommendedContentType: contentType,
      status: "active",
      myPosition: idea.position ?? existed?.myPosition ?? null,
      myUrl: match.pageUrl,
      impressions: idea.impressions ?? existed?.impressions ?? null,
      clicks: idea.clicks ?? existed?.clicks ?? null,
      ctr: idea.ctr ?? existed?.ctr ?? null,
      bestCompetitorPosition: existed?.bestCompetitorPosition ?? null,
      bestCompetitorDomain: existed?.bestCompetitorDomain ?? null,
      rankingGap: existed?.rankingGap ?? null,
      opportunityScore,
      recommendedAction: recommendedAction({
        myPosition: idea.position ?? existed?.myPosition ?? null,
        pageMatchStatus: match.status,
        opportunityScore,
      }),
      competitorPreview: existed?.competitorPreview ?? [],
      lastCheckedAt: idea.source.includes("gsc")
        ? new Date().toISOString()
        : existed?.lastCheckedAt ?? null,
    });

    count += 1;
    if (existed) updated += 1;
    else discovered += 1;
  }

  await appendSeoIntelLog({
    action: "keywords.discover",
    entityType: "keyword",
    actor,
    details: `Upserted ${count} keywords (${discovered} new-ish); GSC ${gscIdeas.length}; clusters ${primarySet.size}`,
    result: "ok",
  });

  return {
    discovered,
    updated,
    clusters: primarySet.size,
    gscQueries: gscIdeas.length,
    errors,
  };
}

export function filterKeywordGap(rows: SeoIntelKeyword[]): SeoIntelKeyword[] {
  return rows.filter((r) => {
    if (r.pageMatchStatus === "no_page") return true;
    if (
      r.bestCompetitorPosition != null &&
      (r.myPosition == null || r.bestCompetitorPosition < r.myPosition)
    ) {
      return true;
    }
    return false;
  });
}

export function filterContentGap(rows: SeoIntelKeyword[]): SeoIntelKeyword[] {
  return rows.filter((r) =>
    ["no_page", "wrong_page", "cannibalisation", "related_page"].includes(
      r.pageMatchStatus,
    ),
  );
}

export function filterOpportunities(rows: SeoIntelKeyword[]): SeoIntelKeyword[] {
  return rows.filter((r) => (r.opportunityScore ?? 0) >= 45);
}

/**
 * Keywords that already map to a page on our site.
 * Admin should improve these before chasing brand-new keyword opportunities.
 */
export function filterOwnedKeywords(rows: SeoIntelKeyword[]): SeoIntelKeyword[] {
  return rows.filter((r) => {
    if (r.pageMatchStatus === "no_page") return false;
    return Boolean(
      r.existingPageUrl ||
        r.myUrl ||
        (r.myPosition != null && r.myPosition > 0),
    );
  });
}

/** Higher = more urgent for admin (behind competitors / weak rank first). */
export function ownedKeywordUrgency(k: SeoIntelKeyword): number {
  const me = k.myPosition;
  const comp = k.bestCompetitorPosition;
  if (comp != null && (me == null || me > comp)) {
    const gap = me == null ? 40 : me - comp;
    return 1000 + gap * 10 + (k.opportunityScore ?? 0);
  }
  if (me == null || me <= 0) return 500 + (k.opportunityScore ?? 0);
  if (me > 20) return 300 + me;
  if (me > 10) return 150 + me;
  if (me > 3) return 50 + me;
  return me;
}

export function sortOwnedRankings(rows: SeoIntelKeyword[]): SeoIntelKeyword[] {
  return [...rows].sort(
    (a, b) => ownedKeywordUrgency(b) - ownedKeywordUrgency(a),
  );
}
