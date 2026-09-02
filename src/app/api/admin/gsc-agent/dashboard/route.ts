import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  getOverviewStats,
  getGscConnectionPublic,
  getSeoSettings,
  listActions,
  listApprovals,
  listOpenIssues,
  listSeoUrls,
  listSitemapRecords,
} from "@/lib/gsc-indexing-agent";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(req.url);
  const view = url.searchParams.get("view") || "overview";

  const [overview, connection, settings] = await Promise.all([
    getOverviewStats(),
    getGscConnectionPublic(),
    getSeoSettings(),
  ]);

  if (view === "overview") {
    return NextResponse.json({
      overview,
      connection,
      settings: {
        agentMode: settings.agentMode,
        paused: settings.paused,
        propertyUri: settings.propertyUri,
        inspectionDailyQuota: settings.inspectionDailyQuota,
        inspectionsUsedToday: settings.inspectionsUsedToday,
        inspectionsQuotaDate: settings.inspectionsQuotaDate,
        lastInventoryAt: settings.lastInventoryAt,
        lastAnalyticsSyncAt: settings.lastAnalyticsSyncAt,
        lastSitemapSubmitAt: settings.lastSitemapSubmitAt,
        automationScheduleEnabled: settings.automationScheduleEnabled ?? false,
        automationFrequency: settings.automationFrequency ?? "daily",
        automationPositionThreshold: settings.automationPositionThreshold ?? 10,
        automationInspectPerRun: settings.automationInspectPerRun ?? 8,
        automationRankingImproveMax: settings.automationRankingImproveMax ?? 5,
        automationStartedAt: settings.automationStartedAt,
        automationLastRunAt: settings.automationLastRunAt,
        automationLastRunDate: settings.automationLastRunDate,
        automationOpenAiImageQueue: settings.automationOpenAiImageQueue ?? [],
      },
    });
  }

  if (view === "urls") {
    const allowed = new Set([
      "indexed",
      "not_indexed",
      "unknown",
      "awaiting_inspection",
      "ranking_opportunity",
      "declining",
      "all",
    ]);
    const filterRaw = url.searchParams.get("filter") || "all";
    const filter = (allowed.has(filterRaw) ? filterRaw : "all") as
      | "indexed"
      | "not_indexed"
      | "unknown"
      | "awaiting_inspection"
      | "ranking_opportunity"
      | "declining"
      | "all";
    const urls = await listSeoUrls({
      limit: 500,
      filter,
      indexStatus: url.searchParams.get("indexStatus") || undefined,
      pageType: url.searchParams.get("pageType") || undefined,
    });
    return NextResponse.json({ urls, overview, connection, filter });
  }

  if (view === "issues") {
    const severity = url.searchParams.get("severity") || undefined;
    let issues = await listOpenIssues(300);
    if (severity) {
      issues = issues.filter(
        (i) => String(i.severity).toUpperCase() === severity.toUpperCase(),
      );
    }
    return NextResponse.json({ issues, overview, severity: severity ?? null });
  }

  if (view === "approvals") {
    const approvals = await listApprovals("pending", 200);
    return NextResponse.json({ approvals, overview });
  }

  if (view === "sitemaps") {
    const sitemaps = await listSitemapRecords();
    return NextResponse.json({ sitemaps, overview, connection });
  }

  if (view === "logs") {
    const actions = await listActions(100);
    return NextResponse.json({ actions, overview });
  }

  return NextResponse.json({ overview, connection });
}
