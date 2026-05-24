import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
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
    });
  }

  const bySlug: Record<string, { views: number; visitors: number }> = {};
  let index = { views: 0, visitors: 0 };

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
    return NextResponse.json({ bySlug, index, source: "analyticsBlogTraffic" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load traffic";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
