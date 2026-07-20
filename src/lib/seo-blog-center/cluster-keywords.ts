import { slugify } from "@/lib/seo-blog-center/utils";
import type { SeoKeywordCluster } from "@/lib/seo-blog-center/types";
import { normalizeKeywordKey } from "@/lib/seo-blog-center/normalize-keywords";
import type { ScoredKeyword } from "@/lib/seo-blog-center/opportunity-score";

function tokenSet(s: string): Set<string> {
  return new Set(normalizeKeywordKey(s).split(" ").filter((t) => t.length > 2));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * Cluster near-duplicate keywords; keep different intents separate.
 */
export function buildKeywordClusters(
  scored: ScoredKeyword[],
  input: {
    researchJobId: string;
    serviceSlug: string;
    location: string;
    language: "en" | "hi" | "both";
    existingUrls: string[];
  },
): SeoKeywordCluster[] {
  const remaining = [...scored].sort(
    (a, b) => (b.opportunityScore ?? 0) - (a.opportunityScore ?? 0),
  );
  const clusters: SeoKeywordCluster[] = [];
  const used = new Set<string>();

  while (remaining.length) {
    const primary = remaining.shift()!;
    if (used.has(primary.normalizedKeyword)) continue;
    used.add(primary.normalizedKeyword);
    const pTokens = tokenSet(primary.keyword);
    const members: ScoredKeyword[] = [primary];

    for (let i = remaining.length - 1; i >= 0; i--) {
      const cand = remaining[i]!;
      if (used.has(cand.normalizedKeyword)) {
        remaining.splice(i, 1);
        continue;
      }
      // Different intent → separate article
      if (cand.intent !== primary.intent) continue;
      const sim = jaccard(pTokens, tokenSet(cand.keyword));
      if (sim >= 0.55) {
        members.push(cand);
        used.add(cand.normalizedKeyword);
        remaining.splice(i, 1);
      }
    }

    const questions = members
      .filter((m) => m.intent === "faq" || /^(how|what|is|can)\b/i.test(m.keyword))
      .map((m) => m.displayKeyword);
    const secondaries = members
      .slice(1)
      .map((m) => m.displayKeyword)
      .filter((k) => !questions.includes(k));

    const now = new Date().toISOString();
    const titleBase = primary.displayKeyword.replace(/\b\w/g, (c) => c.toUpperCase());
    const conflictingUrls = input.existingUrls.filter((u) => {
      const slug = u.split("/").pop() ?? "";
      return jaccard(pTokens, tokenSet(slug.replace(/-/g, " "))) >= 0.5;
    });

    clusters.push({
      id: `cl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      researchJobId: input.researchJobId,
      primaryKeyword: primary.displayKeyword,
      secondaryKeywords: secondaries.slice(0, 12),
      questionKeywords: questions.slice(0, 8),
      keywordIds: [],
      intent: primary.intent,
      contentType: primary.contentType,
      serviceSlug: primary.serviceSlug || input.serviceSlug,
      location: input.location,
      language: input.language,
      suggestedTitle: titleBase.slice(0, 70),
      suggestedSlug: slugify(primary.displayKeyword),
      opportunityScore: primary.opportunityScore,
      cannibalizationScore: Math.round(
        (primary.cannibalizationRisk === "high"
          ? 80
          : primary.cannibalizationRisk === "medium"
            ? 50
            : primary.cannibalizationRisk === "low"
              ? 25
              : 0),
      ),
      conflictingUrls,
      status:
        primary.suggestedAction === "optimize_existing"
          ? "rejected"
          : "pending",
      createdAt: now,
      updatedAt: now,
    });
  }

  return clusters;
}
