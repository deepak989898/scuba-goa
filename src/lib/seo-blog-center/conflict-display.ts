import type { ClusterConflict } from "@/lib/seo-blog-center/types";

function tokenSet(s: string): Set<string> {
  const key = s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return new Set(key.split(" ").filter((t) => t.length > 2));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/** Client-safe conflict enrichment for older clusters that only stored URLs. */
export function enrichConflictsFromUrls(
  primaryKeyword: string,
  urls: string[],
): ClusterConflict[] {
  const pTokens = tokenSet(primaryKeyword);
  const out: ClusterConflict[] = [];
  for (const u of urls) {
    const path = u.startsWith("/") ? u : `/blog/${u.replace(/^.*\//, "")}`;
    const slug = path.split("/").filter(Boolean).pop() ?? "";
    const sim = jaccard(pTokens, tokenSet(slug.replace(/-/g, " ")));
    const similarityPercent = Math.max(45, Math.round(sim * 100) || 50);
    const reasonCode =
      similarityPercent >= 80
        ? "near_duplicate_topic"
        : similarityPercent >= 65
          ? "high_keyword_overlap"
          : similarityPercent >= 50
            ? "medium_keyword_overlap"
            : "related_slug";
    const reason =
      reasonCode === "near_duplicate_topic"
        ? "Near-duplicate topic — existing blog covers almost the same keywords"
        : reasonCode === "high_keyword_overlap"
          ? "High keyword overlap — risk of cannibalizing an existing post"
          : reasonCode === "medium_keyword_overlap"
            ? "Medium keyword overlap — review before writing a new article"
            : "Related existing URL — check if optimize is better than a new post";
    out.push({
      url: path,
      path: path.startsWith("/blog/") ? path : `/blog/${slug}`,
      similarityPercent,
      reason,
      reasonCode,
    });
  }
  return out.sort((a, b) => b.similarityPercent - a.similarityPercent);
}
