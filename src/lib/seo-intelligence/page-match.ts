import { normalizeKeywordKey } from "@/lib/seo-blog-center/normalize-keywords";
import type { SitePageRef } from "./page-corpus";
import type {
  SeoIntelContentType,
  SeoIntelPageMatchStatus,
} from "./types";

export type PageMatchResult = {
  status: SeoIntelPageMatchStatus;
  pageId: string | null;
  pageUrl: string | null;
  pageType: SeoIntelContentType | null;
  note: string;
  score: number;
  competingUrls: string[];
};

function tokenSet(s: string): Set<string> {
  return new Set(
    normalizeKeywordKey(s)
      .split(" ")
      .filter((t) => t.length > 2),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * Match a keyword against the site page corpus.
 * Prefers service pages for transactional/commercial intents when scores are close.
 */
export function matchKeywordToPages(
  keyword: string,
  pages: SitePageRef[],
  opts?: { preferType?: SeoIntelContentType; rankingUrl?: string | null },
): PageMatchResult {
  const kwTokens = tokenSet(keyword);
  if (kwTokens.size === 0 || pages.length === 0) {
    return {
      status: "insufficient_data",
      pageId: null,
      pageUrl: null,
      pageType: null,
      note: "Insufficient data to match a page",
      score: 0,
      competingUrls: [],
    };
  }

  const scored = pages
    .map((p) => {
      const pageTokens = new Set(p.tokens);
      const slugTokens = tokenSet(p.path.replace(/\//g, " "));
      const titleScore = jaccard(kwTokens, tokenSet(p.title));
      const bodyScore = jaccard(kwTokens, pageTokens);
      const slugScore = jaccard(kwTokens, slugTokens);
      let score = Math.max(titleScore * 1.15, bodyScore, slugScore * 1.05);
      if (opts?.preferType && p.pageType === opts.preferType) {
        score += 0.05;
      }
      return { page: p, score };
    })
    .filter((x) => x.score >= 0.35)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return {
      status: "no_page",
      pageId: null,
      pageUrl: null,
      pageType: null,
      note: "No suitable page exists",
      score: 0,
      competingUrls: [],
    };
  }

  const top = scored[0];
  const near = scored.filter((x) => x.score >= top.score - 0.08).slice(0, 5);
  const competingUrls = near.map((x) => x.page.path);

  if (near.length >= 3 && near[1].score >= 0.55) {
    return {
      status: "cannibalisation",
      pageId: top.page.id,
      pageUrl: top.page.path,
      pageType: top.page.pageType,
      note: `Multiple pages compete (${near.length} close matches)`,
      score: top.score,
      competingUrls,
    };
  }

  if (opts?.rankingUrl) {
    const rankingPath = opts.rankingUrl.replace(/^https?:\/\/[^/]+/i, "");
    const rankingMatch = scored.find(
      (x) =>
        x.page.path === rankingPath ||
        rankingPath.endsWith(x.page.path) ||
        x.page.path.endsWith(rankingPath),
    );
    if (rankingMatch && rankingMatch.page.id !== top.page.id) {
      const preferService =
        top.page.pageType === "service_page" &&
        rankingMatch.page.pageType === "blog";
      if (preferService || rankingMatch.score < top.score - 0.1) {
        return {
          status: "wrong_page",
          pageId: top.page.id,
          pageUrl: top.page.path,
          pageType: top.page.pageType,
          note: `Wrong page ranking (${rankingPath}); better match is ${top.page.path}`,
          score: top.score,
          competingUrls,
        };
      }
    }
  }

  if (top.score >= 0.62) {
    return {
      status: "correct_page",
      pageId: top.page.id,
      pageUrl: top.page.path,
      pageType: top.page.pageType,
      note: "Correct page exists",
      score: top.score,
      competingUrls,
    };
  }

  return {
    status: "related_page",
    pageId: top.page.id,
    pageUrl: top.page.path,
    pageType: top.page.pageType,
    note: "Related page exists — may need optimisation",
    score: top.score,
    competingUrls,
  };
}
