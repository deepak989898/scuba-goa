import { listPublishedBlogPostsServer } from "@/lib/blog-posts-server";
import { getAllPackagesServer } from "@/lib/get-packages-server";
import { getAllServicesServer } from "@/lib/get-services-server";
import {
  listSeoUrls,
  matchesUrlFilter,
} from "@/lib/gsc-indexing-agent/store";
import type { IndexStatusCode, SeoUrlRecord } from "@/lib/gsc-indexing-agent/types";
import { listSubServicePaths } from "@/lib/service-sub-helpers";
import { listPublishedSeoPagesServer } from "@/lib/seo-pages-server";

/** Core marketing/static routes (not blog/service detail). */
export const CORE_STATIC_PATHS = [
  "/",
  "/about",
  "/contact",
  "/booking",
  "/services",
  "/blog",
  "/guides",
  "/offers",
  "/gallery",
] as const;

/** Hindi labels for admin inventory (core static). */
export const CORE_STATIC_PAGE_LABELS: Record<
  (typeof CORE_STATIC_PATHS)[number],
  string
> = {
  "/": "Home (होम)",
  "/about": "About (हमारे बारे में)",
  "/contact": "Contact (संपर्क)",
  "/booking": "Booking (बुकिंग)",
  "/services": "Services list (सेवाएँ सूची)",
  "/blog": "Blog index (ब्लॉग सूची)",
  "/guides": "Guides index (गाइड सूची)",
  "/offers": "Offers (ऑफर)",
  "/gallery": "Gallery (गैलरी)",
};

/** Legal / policy pages. */
export const EXTRA_LEGAL_PATHS = [
  "/privacy-policy",
  "/terms-and-conditions",
  "/refund-cancellation",
] as const;

export const EXTRA_LEGAL_PAGE_LABELS: Record<
  (typeof EXTRA_LEGAL_PATHS)[number],
  string
> = {
  "/privacy-policy": "Privacy Policy",
  "/terms-and-conditions": "Terms & Conditions",
  "/refund-cancellation": "Refund & Cancellation",
};

export type PageTypeBucket = {
  total: number;
  indexed: number;
  notIndexed: number;
  pending: number;
};

export type NotIndexedPage = {
  url: string;
  path: string;
  pageType: string;
  contentId: string;
  indexStatus: IndexStatusCode;
  coverageState: string | null;
  why: string;
  improveHint: string;
};

export type ServiceOption = {
  slug: string;
  title: string;
  blogCount: number;
};

/** Per-blog GSC snapshot for admin blog table (from seoUrls). */
export type BlogGscRow = {
  indexStatus: IndexStatusCode;
  /** Short label: Indexed / Not indexed / Pending */
  indexLabel: "indexed" | "not_indexed" | "pending";
  /** Average Search Console position; null if no data */
  position: number | null;
  impressions: number;
  clicks: number;
  lastRankingImprove?: {
    at: string;
    estimatedPct: number;
    summary: string;
    targetBand?: string;
    impressionsAtImprove?: number;
    clicksAtImprove?: number;
    rankingStatus?: string;
  };
};

export type ContentOverview = {
  counts: {
    coreStaticPages: number;
    extraLegalPages: number;
    servicePages: number;
    packagePages: number;
    firestoreBlogs: number;
    publishedBlogs: number;
    guidePages: number;
    totalTrackedInGsc: number;
  };
  coreStaticPages: { path: string; label: string }[];
  extraLegalPages: { path: string; label: string }[];
  /** slug → GSC index + position for blog table columns */
  blogGscBySlug: Record<string, BlogGscRow>;
  /** slug → GSC for /guides table columns */
  guideGscBySlug: Record<string, BlogGscRow>;
  gscByType: Record<string, PageTypeBucket>;
  gscTotals: PageTypeBucket;
  notIndexedSample: NotIndexedPage[];
  services: ServiceOption[];
  gscConnected: boolean;
  disclaimer: string;
};

export function blogGscIndexLabel(
  status: IndexStatusCode,
): BlogGscRow["indexLabel"] {
  if (status === "INDEXED") return "indexed";
  if (
    status === "PENDING_INSPECTION" ||
    status === "UNKNOWN" ||
    status === "API_ERROR"
  ) {
    return "pending";
  }
  return "not_indexed";
}

export function explainIndexStatus(
  status: IndexStatusCode,
  coverageState: string | null,
): { why: string; improveHint: string } {
  const coverage = coverageState?.trim();
  switch (status) {
    case "INDEXED":
      return {
        why: "Indexed in Google",
        improveHint: "Monitor rankings; keep content fresh.",
      };
    case "DISCOVERED_NOT_INDEXED":
      return {
        why: coverage || "Google discovered the URL but has not indexed it yet",
        improveHint:
          "Confirm sitemap, internal links, and unique valuable content; re-inspect in GSC Agent.",
      };
    case "CRAWLED_NOT_INDEXED":
      return {
        why: coverage || "Google crawled the page but chose not to index it",
        improveHint:
          "Strengthen unique content, title/H1 intent, and internal links; avoid thin/duplicate pages.",
      };
    case "NOT_ON_GOOGLE":
      return {
        why: coverage || "Not on Google",
        improveHint:
          "Ensure page is published, linked, and in sitemap; run inventory + inspect in GSC Agent.",
      };
    case "BLOCKED_BY_ROBOTS":
      return {
        why: "Blocked by robots.txt",
        improveHint: "Allow crawling for this path in robots.txt if it should rank.",
      };
    case "BLOCKED_BY_NOINDEX":
      return {
        why: "Blocked by noindex",
        improveHint: "Remove noindex meta/header if the page should appear in Google.",
      };
    case "SOFT_404":
      return {
        why: "Soft 404 (thin / empty signal)",
        improveHint: "Expand real content and fix empty templates.",
      };
    case "NOT_FOUND":
      return {
        why: "HTTP 404",
        improveHint: "Fix the URL, restore the page, or add a proper redirect.",
      };
    case "SERVER_ERROR":
      return {
        why: "Server error when Google crawled",
        improveHint: "Fix 5xx errors, then request re-inspection.",
      };
    case "REDIRECT_ERROR":
      return {
        why: "Redirect error",
        improveHint: "Fix redirect chains/loops to a single 200 canonical URL.",
      };
    case "DUPLICATE_GOOGLE_CANONICAL":
    case "ALTERNATE_WITH_CANONICAL":
      return {
        why: coverage || "Duplicate / alternate canonical",
        improveHint:
          "Consolidate duplicates; keep one canonical URL with clear internal links.",
      };
    case "PENDING_INSPECTION":
      return {
        why: "Not inspected yet in GSC Agent",
        improveHint: "Run URL inventory + inspect queue in GSC Indexing Agent.",
      };
    case "API_ERROR":
      return {
        why: "Last GSC API check failed",
        improveHint: "Reconnect GSC / retry inspection for this URL.",
      };
    default:
      return {
        why: coverage || status || "Unknown index state",
        improveHint: "Inspect this URL in GSC Indexing Agent for details.",
      };
  }
}

function emptyBucket(): PageTypeBucket {
  return { total: 0, indexed: 0, notIndexed: 0, pending: 0 };
}

function bumpBucket(bucket: PageTypeBucket, u: SeoUrlRecord) {
  bucket.total += 1;
  if (u.indexStatus === "INDEXED") bucket.indexed += 1;
  else if (matchesUrlFilter(u, "not_indexed")) bucket.notIndexed += 1;
  else if (matchesUrlFilter(u, "awaiting_inspection") || matchesUrlFilter(u, "unknown")) {
    bucket.pending += 1;
  } else {
    bucket.pending += 1;
  }
}

export async function buildContentOverview(): Promise<ContentOverview> {
  const [
    services,
    packages,
    guides,
    publishedFsBlogs,
    seoUrls,
  ] = await Promise.all([
    getAllServicesServer().catch(() => []),
    getAllPackagesServer().catch(() => []),
    listPublishedSeoPagesServer().catch(() => []),
    listPublishedBlogPostsServer().catch(() => []),
    // Cap reads — store hard-max is 2000. ignoreReadPause: blog table GSC cols.
    listSeoUrls({ limit: 800, ignoreReadPause: true }).catch(
      () => [] as SeoUrlRecord[],
    ),
  ]);

  const subPaths = listSubServicePaths(services);
  const servicePageCount = services.length + subPaths.length;

  // Published blogs only — avoid a second full blogPosts collection scan.
  const firestoreBlogTotal = publishedFsBlogs.length;
  const blogCountByService = new Map<string, number>();
  for (const p of publishedFsBlogs) {
    const key = (p.serviceSlug || "").trim();
    if (!key) continue;
    blogCountByService.set(key, (blogCountByService.get(key) ?? 0) + 1);
  }

  const serviceOptions: ServiceOption[] = [...services]
    .map((s) => ({
      slug: s.slug,
      title: s.title,
      blogCount: blogCountByService.get(s.slug) ?? 0,
    }))
    .sort((a, b) => a.blogCount - b.blogCount || a.title.localeCompare(b.title));

  const gscByType: Record<string, PageTypeBucket> = {};
  const gscTotals = emptyBucket();
  for (const u of seoUrls) {
    const key = u.pageType || "other";
    if (!gscByType[key]) gscByType[key] = emptyBucket();
    bumpBucket(gscByType[key], u);
    bumpBucket(gscTotals, u);
  }

  const notIndexedSample: NotIndexedPage[] = seoUrls
    .filter((u) => {
      if (u.indexStatus === "INDEXED") return false;
      if (
        u.pageType !== "blog" &&
        u.pageType !== "service" &&
        u.pageType !== "static" &&
        u.pageType !== "guide"
      ) {
        return false;
      }
      // Focus list: real not-indexed, awaiting inspect, or unknown/pending
      return (
        matchesUrlFilter(u, "not_indexed") ||
        matchesUrlFilter(u, "awaiting_inspection") ||
        matchesUrlFilter(u, "unknown")
      );
    })
    .sort((a, b) => {
      const aHard = matchesUrlFilter(a, "not_indexed") ? 0 : 1;
      const bHard = matchesUrlFilter(b, "not_indexed") ? 0 : 1;
      return aHard - bHard || (b.updatedAt || "").localeCompare(a.updatedAt || "");
    })
    .slice(0, 20)
    .map((u) => {
      const { why, improveHint } = explainIndexStatus(
        u.indexStatus,
        u.coverageState,
      );
      let path = u.normalizedUrl || u.url;
      try {
        path = new URL(u.normalizedUrl || u.url).pathname;
      } catch {
        /* keep */
      }
      return {
        url: u.normalizedUrl || u.url,
        path,
        pageType: u.pageType,
        contentId: u.contentId,
        indexStatus: u.indexStatus,
        coverageState: u.coverageState,
        why,
        improveHint,
      };
    });

  const gscConnected = seoUrls.length > 0;

  const blogGscBySlug: Record<string, BlogGscRow> = {};
  const guideGscBySlug: Record<string, BlogGscRow> = {};
  for (const u of seoUrls) {
    if (u.pageType === "blog") {
      let slug = String(u.contentId || "")
        .trim()
        .toLowerCase()
        .replace(/^\/?blog\//, "");
      if (!slug) {
        try {
          const path = new URL(u.normalizedUrl || u.url).pathname;
          const m = /^\/blog\/([a-z0-9-]+)\/?$/i.exec(path);
          if (m) slug = m[1].toLowerCase();
        } catch {
          /* skip */
        }
      }
      if (slug) blogGscBySlug[slug] = rowFromSeoUrl(u);
      continue;
    }
    if (u.pageType === "guide") {
      let slug = String(u.contentId || "")
        .trim()
        .toLowerCase()
        .replace(/^\/?guides\//, "");
      if (!slug) {
        try {
          const path = new URL(u.normalizedUrl || u.url).pathname;
          const m = /^\/guides\/([a-z0-9-]+)\/?$/i.exec(path);
          if (m) slug = m[1].toLowerCase();
        } catch {
          /* skip */
        }
      }
      if (slug) guideGscBySlug[slug] = rowFromSeoUrl(u);
    }
  }

  return {
    counts: {
      coreStaticPages: CORE_STATIC_PATHS.length,
      extraLegalPages: EXTRA_LEGAL_PATHS.length,
      servicePages: servicePageCount,
      packagePages: packages.length,
      firestoreBlogs: firestoreBlogTotal,
      publishedBlogs: publishedFsBlogs.length,
      guidePages: guides.length,
      totalTrackedInGsc: seoUrls.length,
    },
    coreStaticPages: CORE_STATIC_PATHS.map((path) => ({
      path,
      label: CORE_STATIC_PAGE_LABELS[path],
    })),
    extraLegalPages: EXTRA_LEGAL_PATHS.map((path) => ({
      path,
      label: EXTRA_LEGAL_PAGE_LABELS[path],
    })),
    blogGscBySlug,
    guideGscBySlug,
    gscByType,
    gscTotals,
    notIndexedSample,
    services: serviceOptions,
    gscConnected,
    disclaimer:
      "GSC status comes from the last inventory/inspection run — not a live Google guarantee. Improve not-indexed pages, then re-inspect in GSC Indexing Agent. Blogs + guides are in /sitemap.xml; guides also at /sitemaps/guides.xml.",
  };
}

function rowFromSeoUrl(u: SeoUrlRecord): BlogGscRow {
  const pos = Number(u.averagePosition);
  const last = u.lastRankingImprove;
  return {
    indexStatus: u.indexStatus,
    indexLabel: blogGscIndexLabel(u.indexStatus),
    position:
      Number.isFinite(pos) && pos > 0 ? Math.round(pos * 10) / 10 : null,
    impressions: Math.max(0, Math.round(Number(u.impressions) || 0)),
    clicks: Math.max(0, Math.round(Number(u.clicks) || 0)),
    ...(last?.at
      ? {
          lastRankingImprove: {
            at: last.at,
            estimatedPct: last.estimatedPct,
            summary: last.summary,
            targetBand: last.targetBand,
            impressionsAtImprove: last.impressionsAtImprove,
            clicksAtImprove: last.clicksAtImprove,
            rankingStatus: last.rankingStatus,
          },
        }
      : {}),
  };
}
