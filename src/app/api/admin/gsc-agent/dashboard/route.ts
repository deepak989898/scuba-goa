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
      },
    });
  }

  if (view === "urls") {
    const urls = await listSeoUrls({
      limit: 500,
      indexStatus: url.searchParams.get("indexStatus") || undefined,
      pageType: url.searchParams.get("pageType") || undefined,
    });
    return NextResponse.json({ urls, overview, connection });
  }

  if (view === "issues") {
    const issues = await listOpenIssues(300);
    return NextResponse.json({ issues, overview });
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
