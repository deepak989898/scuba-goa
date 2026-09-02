import type { SeoBlogKeyword } from "@/lib/seo-blog-center/types";
import { generateSeoBlogDraft } from "@/lib/seo-blog-center/blog-writer";
import { publishBlogDraft } from "@/lib/seo-blog-center/pipeline";
import { generateSeoMetaForKeyword } from "@/lib/seo-blog-center/seo-meta";
import { saveDraft, addSeoBlogLog } from "@/lib/seo-blog-center/store";
import { inferCategory } from "@/lib/seo-blog-center/utils";
import type { SeoIntelKeyword } from "./types";
import { getKeyword, upsertKeyword } from "./keywords-store";
import { appendSeoIntelLog } from "./activity-log";

function intelToBlogKeyword(k: SeoIntelKeyword): SeoBlogKeyword {
  return {
    id: `intel_${k.id}`,
    keyword: k.keyword,
    displayKeyword: k.keyword,
    searchVolume: k.searchVolume ?? 0,
    monthlySearches: k.searchVolume,
    competition: "medium",
    trendScore: 50,
    category: inferCategory(k.keyword),
    seoScore: k.opportunityScore ?? 50,
    opportunityScore: k.opportunityScore,
    intent: k.intent === "commercial" ? "commercial" : "informational",
    status: "approved",
    source: "ai",
    gscClicks: k.clicks,
    gscImpressions: k.impressions,
    gscCtr: k.ctr,
    gscPosition: k.myPosition,
    createdAt: k.discoveredAt,
    updatedAt: k.updatedAt,
  };
}

export type GenerateIntelBlogResult = {
  keywordId: string;
  ok: boolean;
  slug?: string;
  title?: string;
  error?: string;
};

/** Generate + publish a blog for a missing-page SEO Intelligence keyword (free stock images). */
export async function generateBlogFromIntelKeyword(
  intelKeywordId: string,
  actorId: string,
): Promise<{ slug: string; title: string }> {
  const intel = await getKeyword(intelKeywordId);
  if (!intel) throw new Error("Keyword not found");
  if (intel.status !== "active") throw new Error("Keyword is no longer active");

  const blogKw = intelToBlogKeyword(intel);
  const seoMeta = await generateSeoMetaForKeyword(blogKw);
  const draft = await generateSeoBlogDraft({
    keyword: blogKw,
    seoMeta,
    generateAiImage: false,
  });
  draft.status = "approved";
  await saveDraft(draft);

  const published = await publishBlogDraft(draft.id, actorId);

  await upsertKeyword({
    ...intel,
    existingPageId: published.slug,
    existingPageUrl: `/blog/${published.slug}`,
    existingPageType: "blog",
    pageMatchStatus: "correct_page",
    pageMatchNote: `Blog generated from SEO Intelligence (${published.slug})`,
    status: "archived",
    myUrl: `/blog/${published.slug}`,
    recommendedAction: `Published /blog/${published.slug}`,
  });

  await addSeoBlogLog({
    type: "blog_published",
    message: `SEO Intel missing keyword → /blog/${published.slug} (${intel.keyword})`,
    resourceId: draft.id,
  });

  await appendSeoIntelLog({
    action: "keyword_blog_generated",
    entityType: "keyword",
    entityId: intel.id,
    actor: actorId,
    details: `Generated blog /blog/${published.slug} for "${intel.keyword}"`,
    result: "ok",
  });

  return { slug: published.slug, title: published.title };
}

export async function generateBlogsFromIntelKeywords(
  keywordIds: string[],
  actorId: string,
  opts?: { requireMissingPage?: boolean },
): Promise<{
  succeeded: number;
  failed: number;
  results: GenerateIntelBlogResult[];
}> {
  const requireMissing = opts?.requireMissingPage !== false;
  const unique = [...new Set(keywordIds.map((id) => id.trim()).filter(Boolean))];
  const results: GenerateIntelBlogResult[] = [];
  let succeeded = 0;
  let failed = 0;

  for (const keywordId of unique) {
    try {
      if (requireMissing) {
        const intel = await getKeyword(keywordId);
        if (!intel) throw new Error("Keyword not found");
        if (intel.pageMatchStatus !== "no_page") {
          throw new Error("Only missing-page keywords can be generated here");
        }
      }
      const { slug, title } = await generateBlogFromIntelKeyword(keywordId, actorId);
      results.push({ keywordId, ok: true, slug, title });
      succeeded += 1;
    } catch (e) {
      const error = e instanceof Error ? e.message : "Generate failed";
      results.push({ keywordId, ok: false, error });
      failed += 1;
    }
  }

  return { succeeded, failed, results };
}
