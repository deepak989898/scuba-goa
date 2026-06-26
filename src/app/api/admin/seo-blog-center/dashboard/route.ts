import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { getFirebaseAdminInitMessage } from "@/lib/firebase-admin";
import { fetchGscDashboardSummary } from "@/lib/seo-blog-center/gsc-keywords";
import { listDrafts, listKeywords, listLogs, getSeoBlogSettings } from "@/lib/seo-blog-center/store";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const auth = await authenticateAdminRequest(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const [settings, keywords, drafts, logs, gsc] = await Promise.all([
      getSeoBlogSettings(),
      listKeywords(undefined, 300),
      listDrafts(undefined, 100),
      listLogs(30),
      fetchGscDashboardSummary(),
    ]);

    const keywordStats = {
      pending: keywords.filter((k) => k.status === "pending").length,
      approved: keywords.filter((k) => k.status === "approved").length,
      rejected: keywords.filter((k) => k.status === "rejected").length,
      fromGsc: keywords.filter((k) => k.source === "gsc").length,
      fromCity: keywords.filter((k) => k.source === "city_research").length,
    };

    const draftStats = {
      draft: drafts.filter((d) => d.status === "draft").length,
      pending_approval: drafts.filter((d) => d.status === "pending_approval").length,
      approved: drafts.filter((d) => d.status === "approved").length,
      published: drafts.filter((d) => d.status === "published").length,
    };

    return NextResponse.json({
      settings,
      keywordStats,
      draftStats,
      recentKeywords: keywords.slice(0, 20),
      recentDrafts: drafts.slice(0, 15),
      logs,
      gsc,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const hint = getFirebaseAdminInitMessage();
    console.error("[seo-blog-center/dashboard]", e);
    return NextResponse.json(
      { error: hint ? `${msg} (${hint})` : msg },
      { status: 500 },
    );
  }
}
