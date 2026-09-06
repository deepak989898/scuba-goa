import { createHash } from "crypto";
import { getAllPermanentRedirects } from "@/lib/blog-redirects";
import { listPublishedBlogPostsServer } from "@/lib/blog-posts-server";
import { getAllPackagesServer } from "@/lib/get-packages-server";
import { listSubServicePaths } from "@/lib/service-sub-helpers";
import { listPublishedSeoPagesServer } from "@/lib/seo-pages-server";
import { getServicesForPublicSeo } from "@/lib/services-for-seo";
import {
  isExcludedPath,
  normalizeSiteUrl,
  siteId,
  siteOrigin,
  urlIdFromNormalized,
} from "./normalize-url";
import { upsertSeoUrl, logAction } from "./store";
import { saveSeoSettings } from "./settings";
import type { PageType, SeoUrlRecord } from "./types";

type Discovered = {
  path: string;
  pageType: PageType;
  contentId: string;
  publishedAt: string | null;
  contentUpdatedAt: string | null;
  locale?: string;
};

function buildRecord(d: Discovered, existing?: SeoUrlRecord | null): SeoUrlRecord | null {
  const origin = siteOrigin();
  const absolute = `${origin}${d.path.startsWith("/") ? d.path : `/${d.path}`}`;
  const normalized = normalizeSiteUrl(absolute);
  if (!normalized) return null;
  const u = new URL(normalized);
  if (isExcludedPath(u.pathname)) return null;

  const now = new Date().toISOString();
  const id = urlIdFromNormalized(normalized);
  return {
    id,
    url: normalized,
    normalizedUrl: normalized,
    canonicalUrl: normalized,
    pageType: d.pageType,
    contentId: d.contentId,
    locale: d.locale || "en",
    status: "active",
    publishedAt: d.publishedAt,
    contentUpdatedAt: d.contentUpdatedAt,
    discoveredAt: existing?.discoveredAt || now,
    lastSitemapIncludedAt: existing?.lastSitemapIncludedAt ?? null,
    sitemapName:
      existing?.sitemapName ??
      (d.pageType === "blog"
        ? "blog"
        : d.pageType === "guide"
          ? "guides"
          : d.pageType === "service" || d.pageType === "package"
            ? "services"
            : "static"),
    eligibleForIndexing: true,
    noindexDetected: false,
    robotsBlocked: false,
    httpStatus: existing?.httpStatus ?? null,
    contentHash: existing?.contentHash ?? null,
    lastInspectionAt: existing?.lastInspectionAt ?? null,
    nextInspectionAt: existing?.nextInspectionAt ?? now,
    inspectionPriority: existing?.inspectionPriority ?? (d.pageType === "blog" || d.pageType === "service" ? 1 : 2),
    indexStatus: existing?.indexStatus ?? "PENDING_INSPECTION",
    coverageState: existing?.coverageState ?? null,
    crawlState: existing?.crawlState ?? null,
    googleCanonical: existing?.googleCanonical ?? null,
    userCanonical: normalized,
    lastCrawlTime: existing?.lastCrawlTime ?? null,
    referringUrlsCount: existing?.referringUrlsCount ?? 0,
    internalLinksIn: existing?.internalLinksIn ?? 0,
    internalLinksOut: existing?.internalLinksOut ?? 0,
    impressions: existing?.impressions ?? 0,
    clicks: existing?.clicks ?? 0,
    ctr: existing?.ctr ?? 0,
    averagePosition: existing?.averagePosition ?? 0,
    rankingStatus: existing?.rankingStatus ?? "NEW_NO_DATA",
    issueCodes: existing?.issueCodes ?? [],
    recommendationCodes: existing?.recommendationCodes ?? [],
    autoFixStatus: existing?.autoFixStatus ?? "none",
    approvalStatus: existing?.approvalStatus ?? "none",
    lastActionAt: existing?.lastActionAt ?? null,
    retryCount: existing?.retryCount ?? 0,
    siteId: siteId(),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    ...(existing?.lastRankingImprove
      ? { lastRankingImprove: existing.lastRankingImprove }
      : {}),
  };
}

/**
 * Live site URL candidates (same rules as inventory).
 * Used by Discover URLs + Clean stale seoUrls.
 */
export async function collectLiveDiscoveredUrls(): Promise<{
  items: Discovered[];
  /** Normalized URL doc ids that should stay in seoUrls */
  liveIds: Set<string>;
  livePaths: string[];
}> {
  const redirected = new Set(
    getAllPermanentRedirects().map((r) => r.source),
  );
  const items: Discovered[] = [];

  const staticPaths = [
    "",
    "/about",
    "/contact",
    "/booking",
    "/services",
    "/blog",
    "/guides",
    "/offers",
    "/gallery",
    "/privacy-policy",
    "/terms-and-conditions",
    "/refund-cancellation",
  ];
  for (const path of staticPaths) {
    items.push({
      path: path || "/",
      pageType: "static",
      contentId: path || "home",
      publishedAt: null,
      contentUpdatedAt: null,
    });
  }

  const servicesForInventory = await getServicesForPublicSeo();
  const seenServicePaths = new Set<string>();
  for (const s of servicesForInventory) {
    const path = `/services/${s.slug}`;
    if (redirected.has(path) || seenServicePaths.has(path)) continue;
    seenServicePaths.add(path);
    items.push({
      path,
      pageType: "service",
      contentId: s.slug,
      publishedAt: null,
      contentUpdatedAt: "2026-04-03",
    });
  }
  for (const sub of listSubServicePaths(servicesForInventory)) {
    if (redirected.has(sub.path)) continue;
    items.push({
      path: sub.path,
      pageType: "service",
      contentId: sub.subSlug,
      publishedAt: null,
      contentUpdatedAt: "2026-07-25",
    });
  }

  const packages = await getAllPackagesServer();
  for (const p of packages) {
    items.push({
      path: `/packages/${p.id}`,
      pageType: "package",
      contentId: p.id,
      publishedAt: null,
      contentUpdatedAt: "2026-06-12",
    });
  }

  const fsBlogs = await listPublishedBlogPostsServer();
  for (const p of fsBlogs) {
    if (redirected.has(`/blog/${p.slug}`)) continue;
    if (!p.published) continue;
    items.push({
      path: `/blog/${p.slug}`,
      pageType: "blog",
      contentId: p.slug,
      publishedAt: p.publishedAt || p.date,
      contentUpdatedAt: p.updatedAt,
      locale: p.language || "en",
    });
  }

  const guides = await listPublishedSeoPagesServer();
  for (const g of guides) {
    const path = `/guides/${g.slug}`;
    if (redirected.has(path)) continue;
    items.push({
      path: `/guides/${g.slug}`,
      pageType: "guide",
      contentId: g.slug,
      publishedAt: g.updatedAt,
      contentUpdatedAt: g.updatedAt,
    });
  }

  const liveIds = new Set<string>();
  const livePaths: string[] = [];
  for (const d of items) {
    const rec = buildRecord(d);
    if (!rec || liveIds.has(rec.id)) continue;
    liveIds.add(rec.id);
    try {
      livePaths.push(new URL(rec.normalizedUrl).pathname);
    } catch {
      livePaths.push(d.path);
    }
  }

  return { items, liveIds, livePaths };
}

/** Discover canonical indexable URLs and upsert seoUrls. */
export async function runUrlInventoryDiscovery(): Promise<{
  discovered: number;
  upserted: number;
}> {
  const { items, liveIds } = await collectLiveDiscoveredUrls();

  let upserted = 0;
  const seen = new Set<string>();
  for (const d of items) {
    const rec = buildRecord(d);
    if (!rec || seen.has(rec.id)) continue;
    seen.add(rec.id);
    await upsertSeoUrl(rec);
    upserted += 1;
  }

  await saveSeoSettings({ lastInventoryAt: new Date().toISOString() });
  await logAction({
    action: "inventory_discovery",
    detail: `Discovered ${items.length} candidates, upserted ${upserted} (liveIds=${liveIds.size})`,
    ok: true,
  });

  return { discovered: items.length, upserted };
}

export function contentHashFromText(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 32);
}
