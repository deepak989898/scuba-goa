import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  countBlogViewsForSlugs,
  loadContentTrafficWithBackfill,
  mergeContentTraffic,
} from "@/lib/analytics-content-traffic";
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
        : "aggregated";
  const slugsParam = url.searchParams.get("slugs")?.trim() ?? "";
  const focusSlugs = slugsParam
    ? slugsParam
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 80)
    : [];

  try {
    const { bySlug, index, aggregatedDocs, backfilled } =
      await loadContentTrafficWithBackfill(db, {
        collection: "analyticsBlogTraffic",
        indexDocId: BLOG_INDEX_KEY,
        mode: focusSlugs.length > 0 ? "aggregated" : mode,
        backfill: {
          pathPrefix: "/blog",
          indexPath: "/blog",
          slugPattern: /^\/blog\/([a-z0-9-]+)$/,
        },
      });

    if (focusSlugs.length > 0) {
      const precise = await countBlogViewsForSlugs(db, focusSlugs);
      for (const [slug, t] of Object.entries(precise)) {
        mergeContentTraffic(bySlug, slug, t.views, t.visitors);
      }
    } else if (mode === "full") {
      // already backfilled inside loader
    }

    return NextResponse.json({
      bySlug,
      index,
      source:
        focusSlugs.length > 0
          ? "analyticsBlogTraffic+slugCounts"
          : backfilled
            ? "analyticsBlogTraffic+pageViews"
            : "analyticsBlogTraffic",
      trackingConfigured: true,
      aggregatedDocs,
      backfilled: backfilled || focusSlugs.length > 0,
      mode: focusSlugs.length > 0 ? "slugs" : mode,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load traffic";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
