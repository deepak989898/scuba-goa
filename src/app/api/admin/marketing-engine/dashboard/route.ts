import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { firestoreDocToJson } from "@/lib/firestore-json";
import { getMarketingEngineSettings } from "@/lib/marketing-engine/settings";

function latest(docs: QueryDocumentSnapshot[], limit: number) {
  return [...docs]
    .sort((a, b) =>
      String(b.data().updatedAt ?? b.data().createdAt ?? b.id).localeCompare(
        String(a.data().updatedAt ?? a.data().createdAt ?? a.id),
      ),
    )
    .slice(0, limit)
    .map((d) => firestoreDocToJson(d.id, d.data()));
}

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Firebase Admin not configured" }, { status: 500 });
  }

  try {
    const url = new URL(req.url);
    const days = Math.min(30, Math.max(1, Number(url.searchParams.get("days") ?? 14)));

    const [
      reportsSnap,
      analyticsSnap,
      contentSnap,
      postsSnap,
      adsSnap,
      clustersSnap,
      promptsSnap,
      reelsSnap,
      competitorSnap,
      campaignsSnap,
      actionsSnap,
      settings,
    ] = await Promise.all([
      db.collection("marketingAgentReports").get(),
      db.collection("marketingAnalytics").get(),
      db.collection("marketingGeneratedContent").get(),
      db.collection("marketingSocialPosts").get(),
      db.collection("marketingAdCopies").get(),
      db.collection("marketingSeoClusters").get(),
      db.collection("marketingAiPrompts").get(),
      db.collection("marketingReelsIdeas").get(),
      db.collection("marketingCompetitorReports").get(),
      db.collection("marketingCampaigns").get(),
      db.collection("marketingAgentActions").get(),
      getMarketingEngineSettings(),
    ]);

    const reports = [...reportsSnap.docs]
      .sort((a, b) => b.id.localeCompare(a.id))
      .slice(0, days)
      .map((d) => firestoreDocToJson(d.id, d.data()));

    const analytics = [...analyticsSnap.docs]
      .sort((a, b) => b.id.localeCompare(a.id))
      .slice(0, days)
      .map((d) => firestoreDocToJson(d.id, d.data()));

    const actions = latest(actionsSnap.docs, 50);
    const pending = actions.filter((a) => a.status === "pending_approval");
    const latestReport = reports[0] ?? null;
    const latestAnalytics = analytics[0] ?? null;

    return NextResponse.json({
      settings,
      reports,
      analytics,
      latestReport,
      latestAnalytics,
      stats: {
        contentCount: contentSnap.size,
        socialPosts: postsSnap.size,
        adCopies: adsSnap.size,
        campaigns: campaignsSnap.size,
        pendingApprovals: pending.length,
        publishedCampaigns: campaignsSnap.docs.filter(
          (d) => (d.data() as { status?: string }).status === "published",
        ).length,
      },
      content: latest(contentSnap.docs, 20),
      socialPosts: latest(postsSnap.docs, 14),
      adCopies: latest(adsSnap.docs, 10),
      seoClusters: latest(clustersSnap.docs, 6),
      imagePrompts: latest(promptsSnap.docs, 10),
      reelsIdeas: latest(reelsSnap.docs, 10),
      competitorReports: latest(competitorSnap.docs, 5),
      campaigns: latest(campaignsSnap.docs, 15),
      actions,
      pendingActions: pending,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
