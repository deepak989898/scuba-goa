import {
  normalizeSiteUrl,
  siteId,
  siteOrigin,
  urlIdFromNormalized,
} from "./normalize-url";
import { auditUrl } from "./audit";
import { enqueueInspection } from "./inspect-queue";
import { upsertSeoUrl, logAction, saveIssue } from "./store";
import { getSeoUrl } from "./store";
import type { SeoUrlRecord } from "./types";
import { createHash } from "crypto";

/**
 * Call after a blog (or other) URL is published.
 * Does NOT use Indexing API. Adds inventory + audit + delayed inspection.
 */
export async function onPublicUrlPublished(input: {
  path: string;
  pageType: SeoUrlRecord["pageType"];
  contentId: string;
  publishedAt?: string | null;
  locale?: string;
}): Promise<{ ok: true; urlId: string } | { ok: false; error: string }> {
  const absolute = `${siteOrigin()}${input.path.startsWith("/") ? input.path : `/${input.path}`}`;
  const normalized = normalizeSiteUrl(absolute);
  if (!normalized) return { ok: false, error: "Invalid public URL" };

  const id = urlIdFromNormalized(normalized);
  const existing = await getSeoUrl(id);
  const now = new Date().toISOString();

  let record: SeoUrlRecord = {
    id,
    url: normalized,
    normalizedUrl: normalized,
    canonicalUrl: normalized,
    pageType: input.pageType,
    contentId: input.contentId,
    locale: input.locale || "en",
    status: "active",
    publishedAt: input.publishedAt || now,
    contentUpdatedAt: now,
    discoveredAt: existing?.discoveredAt || now,
    lastSitemapIncludedAt: now,
    sitemapName: input.pageType === "blog" ? "blog" : existing?.sitemapName || "static",
    eligibleForIndexing: true,
    noindexDetected: false,
    robotsBlocked: false,
    httpStatus: null,
    contentHash: null,
    lastInspectionAt: null,
    nextInspectionAt: new Date(Date.now() + 90 * 60_000).toISOString(),
    inspectionPriority: 1,
    indexStatus: "PENDING_INSPECTION",
    coverageState: null,
    crawlState: null,
    googleCanonical: null,
    userCanonical: normalized,
    lastCrawlTime: null,
    referringUrlsCount: existing?.referringUrlsCount ?? 0,
    internalLinksIn: existing?.internalLinksIn ?? 0,
    internalLinksOut: existing?.internalLinksOut ?? 0,
    impressions: existing?.impressions ?? 0,
    clicks: existing?.clicks ?? 0,
    ctr: existing?.ctr ?? 0,
    averagePosition: existing?.averagePosition ?? 0,
    rankingStatus: "NEW_NO_DATA",
    issueCodes: [],
    recommendationCodes: [],
    autoFixStatus: "none",
    approvalStatus: "none",
    lastActionAt: now,
    retryCount: 0,
    siteId: siteId(),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  await upsertSeoUrl(record);

  const audit = await auditUrl(record);
  record = {
    ...record,
    httpStatus: audit.httpStatus,
    contentHash: audit.contentHash,
    noindexDetected: audit.noindex,
    userCanonical: audit.canonical || record.userCanonical,
    issueCodes: audit.issues.map((i) => i.code),
    eligibleForIndexing:
      !audit.noindex &&
      audit.httpStatus === 200 &&
      Boolean(audit.title) &&
      Boolean(audit.canonical || true),
    updatedAt: new Date().toISOString(),
  };
  await upsertSeoUrl(record);

  for (const issue of audit.issues) {
    const iid = createHash("sha256")
      .update(`${record.id}:${issue.code}`)
      .digest("hex")
      .slice(0, 28);
    await saveIssue({
      ...issue,
      id: iid,
      siteId: siteId(),
      createdAt: now,
      updatedAt: now,
    });
  }

  await enqueueInspection(record, 1, 90);
  await logAction({
    urlId: record.id,
    url: record.url,
    action: "publish_hook",
    detail: `Published checklist: HTTP ${audit.httpStatus}, title=${Boolean(audit.title)}, issues=${audit.issues.length}. Inspection queued (no Indexing API).`,
    ok: audit.httpStatus === 200,
  });

  return { ok: true, urlId: record.id };
}
