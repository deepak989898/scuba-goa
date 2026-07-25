import { getAdminDb } from "@/lib/firebase-admin";
import { stripUndefinedDeep } from "@/lib/firestore-json";
import type {
  OverviewStats,
  SeoActionLog,
  SeoApproval,
  SeoIssue,
  SeoSitemapRecord,
  SeoUrlRecord,
} from "./types";
import { getSeoSettings } from "./settings";
import { getGscConnectionPublic } from "./connection";
import { siteId } from "./normalize-url";

export const SEO_URLS = "seoUrls";
export const SEO_ISSUES = "seoIssues";
export const SEO_APPROVALS = "seoApprovals";
export const SEO_ACTIONS = "seoActions";
export const SEO_SITEMAPS = "seoSitemaps";
export const SEO_INSPECTIONS = "seoInspections";
export const SEO_ANALYTICS_DAILY = "seoAnalyticsDaily";
export const SEO_AGENT_RUNS = "seoAgentRuns";

export async function upsertSeoUrl(
  record: SeoUrlRecord,
): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  await db
    .collection(SEO_URLS)
    .doc(record.id)
    .set(stripUndefinedDeep(record), { merge: true });
}

export async function getSeoUrl(id: string): Promise<SeoUrlRecord | null> {
  const db = getAdminDb();
  if (!db) return null;
  const snap = await db.collection(SEO_URLS).doc(id).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...(snap.data() as Omit<SeoUrlRecord, "id">) };
}

export async function listSeoUrls(options?: {
  limit?: number;
  indexStatus?: string;
  pageType?: string;
  severityIssue?: boolean;
}): Promise<SeoUrlRecord[]> {
  const db = getAdminDb();
  if (!db) return [];
  // Avoid composite index requirements — filter in memory for MVP scale
  const snap = await db
    .collection(SEO_URLS)
    .limit(Math.min(2000, options?.limit ?? 500))
    .get();
  let rows = snap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as SeoUrlRecord,
  );
  if (options?.indexStatus) {
    rows = rows.filter((r) => r.indexStatus === options.indexStatus);
  }
  if (options?.pageType) {
    rows = rows.filter((r) => r.pageType === options.pageType);
  }
  rows.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  return rows;
}

export async function saveIssue(issue: SeoIssue): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  await db.collection(SEO_ISSUES).doc(issue.id).set(stripUndefinedDeep(issue), {
    merge: true,
  });
}

export async function listOpenIssues(limit = 200): Promise<SeoIssue[]> {
  const db = getAdminDb();
  if (!db) return [];
  const snap = await db.collection(SEO_ISSUES).limit(limit * 2).get();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as SeoIssue)
    .filter((i) => i.status === "open" || i.status === "pending_approval")
    .slice(0, limit);
}

export async function saveApproval(a: SeoApproval): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  await db.collection(SEO_APPROVALS).doc(a.id).set(stripUndefinedDeep(a), {
    merge: true,
  });
}

export async function listApprovals(
  status: string = "pending",
  limit = 100,
): Promise<SeoApproval[]> {
  const db = getAdminDb();
  if (!db) return [];
  const snap = await db.collection(SEO_APPROVALS).limit(limit * 2).get();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as SeoApproval)
    .filter((a) => a.status === status)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export async function logAction(
  action: Omit<SeoActionLog, "id" | "siteId" | "createdAt"> & {
    id?: string;
  },
): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  const id =
    action.id ||
    `act_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const row: SeoActionLog = {
    id,
    siteId: siteId(),
    createdAt: new Date().toISOString(),
    urlId: action.urlId,
    url: action.url,
    action: action.action,
    detail: action.detail,
    ok: action.ok,
  };
  await db.collection(SEO_ACTIONS).doc(id).set(stripUndefinedDeep(row));
}

export async function listActions(limit = 80): Promise<SeoActionLog[]> {
  const db = getAdminDb();
  if (!db) return [];
  const snap = await db.collection(SEO_ACTIONS).limit(limit * 2).get();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as SeoActionLog)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export async function saveSitemapRecord(row: SeoSitemapRecord): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  await db.collection(SEO_SITEMAPS).doc(row.id).set(stripUndefinedDeep(row), {
    merge: true,
  });
}

export async function listSitemapRecords(): Promise<SeoSitemapRecord[]> {
  const db = getAdminDb();
  if (!db) return [];
  const snap = await db.collection(SEO_SITEMAPS).limit(50).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SeoSitemapRecord);
}

export async function getOverviewStats(): Promise<OverviewStats> {
  const [urls, issues, approvals, sitemaps, settings, conn] = await Promise.all([
    listSeoUrls({ limit: 2000 }),
    listOpenIssues(500),
    listApprovals("pending", 200),
    listSitemapRecords(),
    getSeoSettings(),
    getGscConnectionPublic(),
  ]);

  const indexed = urls.filter((u) => u.indexStatus === "INDEXED").length;
  const notIndexed = urls.filter((u) =>
    [
      "NOT_ON_GOOGLE",
      "DISCOVERED_NOT_INDEXED",
      "CRAWLED_NOT_INDEXED",
      "BLOCKED_BY_ROBOTS",
      "BLOCKED_BY_NOINDEX",
    ].includes(u.indexStatus),
  ).length;
  const unknown = urls.filter((u) =>
    ["UNKNOWN", "PENDING_INSPECTION", "API_ERROR"].includes(u.indexStatus),
  ).length;

  return {
    totalUrls: urls.length,
    indexed,
    notIndexed,
    unknown,
    criticalIssues: issues.filter((i) => i.severity === "CRITICAL").length,
    awaitingInspection: urls.filter(
      (u) =>
        u.indexStatus === "PENDING_INSPECTION" ||
        (!u.lastInspectionAt && u.eligibleForIndexing),
    ).length,
    rankingOpportunities: urls.filter((u) =>
      ["POSITION_4_TO_10", "POSITION_11_TO_20", "LOW_CTR", "IMPRESSIONS_NO_CLICKS"].includes(
        u.rankingStatus,
      ),
    ).length,
    declining: urls.filter((u) =>
      ["DECLINING", "LOST_TRAFFIC"].includes(u.rankingStatus),
    ).length,
    pendingApprovals: approvals.length,
    sitemapErrors: sitemaps.filter((s) => Boolean(s.lastError)).length,
    agentMode: settings.agentMode,
    paused: settings.paused,
    connectionHealth: conn.connected ? conn.healthOk : conn.serviceAccountFallback,
    propertyUri: conn.propertyUri,
  };
}
