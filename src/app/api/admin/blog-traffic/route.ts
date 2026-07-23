import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { loadContentTrafficWithBackfill } from "@/lib/analytics-content-traffic";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const BLOG_INDEX_KEY = "__blog_index__";

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

  const url = new URL(req.url);
  const modeParam = url.searchParams.get("mode");
  const mode =
    modeParam === "full"
      ? "full"
      : modeParam === "aggregated"
        ? "aggregated"
        : // Fast default for admin tables; use ?mode=full to rescan pageViews.
          "aggregated";

  try {
    const { bySlug, index, aggregatedDocs, backfilled } =
      await loadContentTrafficWithBackfill(db, {
        collection: "analyticsBlogTraffic",
        indexDocId: BLOG_INDEX_KEY,
        mode,
        backfill: {
          pathPrefix: "/blog",
          indexPath: "/blog",
          slugPattern: /^\/blog\/([a-z0-9-]+)$/,
        },
      });

    return NextResponse.json({
      bySlug,
      index,
      source: backfilled
        ? "analyticsBlogTraffic+pageViews"
        : "analyticsBlogTraffic",
      trackingConfigured: true,
      aggregatedDocs,
      backfilled,
      mode,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load traffic";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
