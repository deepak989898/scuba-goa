import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { loadContentTrafficWithBackfill } from "@/lib/analytics-content-traffic";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const GUIDE_INDEX_KEY = "__guides_index__";

export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({
      bySlug: {},
      index: { views: 0, visitors: 0 },
      source: "none",
      trackingConfigured: false,
    });
  }

  try {
    const { bySlug, index, aggregatedDocs, backfilled } =
      await loadContentTrafficWithBackfill(db, {
        collection: "analyticsGuideTraffic",
        indexDocId: GUIDE_INDEX_KEY,
        mode: "aggregated",
        backfill: {
          pathPrefix: "/guides",
          indexPath: "/guides",
          slugPattern: /^\/guides\/([a-z0-9-]+)$/,
        },
      });

    return NextResponse.json({
      bySlug,
      index,
      source: backfilled
        ? "analyticsGuideTraffic+pageViews"
        : "analyticsGuideTraffic",
      trackingConfigured: true,
      aggregatedDocs,
      backfilled,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load traffic";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
