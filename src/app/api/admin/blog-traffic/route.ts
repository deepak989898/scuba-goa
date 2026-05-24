import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const BLOG_INDEX_KEY = "__blog_index__";
const PAGE_VIEWS_BACKFILL_LIMIT = 5000;

type Traffic = { views: number; visitors: number };

function mergeTraffic(
  target: Record<string, Traffic>,
  slug: string,
  views: number,
  visitors: number,
) {
  const cur = target[slug];
  if (!cur) {
    target[slug] = { views, visitors };
    return;
  }
  target[slug] = {
    views: Math.max(cur.views, views),
    visitors: Math.max(cur.visitors, visitors),
  };
}

/** Count blog views from raw pageViews when aggregated docs were broken or empty. */
async function backfillBlogTrafficFromPageViews(
  db: NonNullable<ReturnType<typeof getAdminDb>>,
): Promise<{ bySlug: Record<string, Traffic>; index: Traffic }> {
  const bySlug: Record<string, Traffic> = {};
  const indexVisitors = new Set<string>();
  let indexViews = 0;
  const slugVisitors = new Map<string, Set<string>>();

  const snap = await db
    .collection("pageViews")
    .orderBy("createdAt", "desc")
    .limit(PAGE_VIEWS_BACKFILL_LIMIT)
    .get();

  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    if (data.eventType !== "view") continue;
    const pathRaw = String(data.path ?? "").trim();
    if (!pathRaw.startsWith("/blog")) continue;
    const path =
      pathRaw.length > 1 && pathRaw.endsWith("/")
        ? pathRaw.slice(0, -1)
        : pathRaw.split("?")[0];
    const sessionId = String(data.sessionId ?? "anon").trim() || "anon";

    if (path === "/blog") {
      indexViews += 1;
      indexVisitors.add(sessionId);
      continue;
    }

    const m = /^\/blog\/([a-z0-9-]+)$/.exec(path);
    if (!m) continue;
    const slug = m[1];
    if (!slugVisitors.has(slug)) slugVisitors.set(slug, new Set());
    slugVisitors.get(slug)!.add(sessionId);
    const row = bySlug[slug] ?? { views: 0, visitors: 0 };
    row.views += 1;
    bySlug[slug] = row;
  }

  for (const [slug, sessions] of slugVisitors) {
    const row = bySlug[slug] ?? { views: 0, visitors: 0 };
    row.visitors = sessions.size;
    bySlug[slug] = row;
  }

  return {
    bySlug,
    index: { views: indexViews, visitors: indexVisitors.size },
  };
}

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

  const bySlug: Record<string, Traffic> = {};
  let index: Traffic = { views: 0, visitors: 0 };

  try {
    const snap = await db.collection("analyticsBlogTraffic").get();
    for (const doc of snap.docs) {
      const data = doc.data() as Record<string, unknown>;
      const views = Math.max(0, Math.round(Number(data.views ?? 0)));
      const visitors = Math.max(0, Math.round(Number(data.visitors ?? 0)));
      const traffic = { views, visitors };
      if (doc.id === BLOG_INDEX_KEY) {
        index = traffic;
        continue;
      }
      const slug = String(data.slug ?? doc.id).trim();
      if (slug) bySlug[slug] = traffic;
    }

    const backfill = await backfillBlogTrafficFromPageViews(db);
    for (const [slug, t] of Object.entries(backfill.bySlug)) {
      mergeTraffic(bySlug, slug, t.views, t.visitors);
    }
    index = {
      views: Math.max(index.views, backfill.index.views),
      visitors: Math.max(index.visitors, backfill.index.visitors),
    };

    return NextResponse.json({
      bySlug,
      index,
      source: "analyticsBlogTraffic+pageViews",
      trackingConfigured: true,
      aggregatedDocs: snap.size,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load traffic";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
