import { getAdminDb } from "@/lib/firebase-admin";
import { istYesterdayString } from "@/lib/ai-analytics/ist";
import type { AgentId, AgentSnapshot } from "@/lib/command-center/types";

export async function collectAgentSnapshots(dateIst?: string): Promise<AgentSnapshot[]> {
  const db = getAdminDb();
  const day = dateIst?.trim() || istYesterdayString();

  if (!db) {
    return [];
  }

  const [
    aiSnap,
    convSnap,
    seoSnap,
    bizSnap,
    recoveryLeadsSnap,
    marketingSnap,
    ratingsSnap,
    competitorSnap,
    offersSnap,
    bizActionsSnap,
    mktActionsSnap,
  ] = await Promise.all([
    db.collection("aiAnalyticsDaily").doc(day).get(),
    db.collection("conversionOptDaily").doc(day).get(),
    db.collection("seoWeeklyReports").get(),
    db.collection("businessAgentReports").doc(day).get(),
    db.collection("recoveryLeads").limit(200).get(),
    db.collection("marketingAgentReports").doc(day).get(),
    db.collection("ratings").limit(100).get(),
    db.collection("marketingCompetitorReports").limit(3).get(),
    db.collection("offers").get(),
    db.collection("businessAgentActions").limit(50).get(),
    db.collection("marketingAgentActions").limit(50).get(),
  ]);

  const seoLatest = [...seoSnap.docs].sort((a, b) => b.id.localeCompare(a.id))[0];
  const ai = aiSnap.exists ? (aiSnap.data() as Record<string, unknown>) : null;
  const internal = (ai?.internal ?? {}) as Record<string, unknown>;
  const insights = (ai?.insights ?? {}) as Record<string, unknown>;
  const gsc = (ai?.searchConsole ?? {}) as Record<string, unknown>;

  const hotLeads = recoveryLeadsSnap.docs.filter(
    (d) => (d.data() as { temperature?: string }).temperature === "hot",
  ).length;
  const abandoned = recoveryLeadsSnap.docs.filter(
    (d) => (d.data() as { status?: string }).status === "active",
  ).length;

  const ratings = ratingsSnap.docs.map((d) => d.data() as Record<string, unknown>);
  const approved = ratings.filter((r) => r.approved === true);
  const avgRating =
    approved.length > 0
      ? approved.reduce((s, r) => s + Number(r.rating ?? 0), 0) / approved.length
      : 0;
  const lowRatings = approved.filter((r) => Number(r.rating ?? 5) <= 3);

  const pendingBiz = bizActionsSnap.docs.filter(
    (d) => (d.data() as { status?: string }).status === "pending_approval",
  ).length;
  const pendingMkt = mktActionsSnap.docs.filter(
    (d) => (d.data() as { status?: string }).status === "pending_approval",
  ).length;

  const competitorLatest = [...competitorSnap.docs].sort((a, b) => b.id.localeCompare(a.id))[0];

  const snapshots: AgentSnapshot[] = [
    {
      agentId: "analytics",
      status: ai || convSnap.exists ? "ok" : "skipped",
      lastRunAt: String(ai?.generatedAt ?? ""),
      summary: ai
        ? `${internal.pageViews ?? 0} views, ${internal.bookingsPaid ?? 0} bookings, ${((convSnap.data() as { issues?: unknown[] } | undefined)?.issues ?? []).length} conversion issues`
        : convSnap.exists
          ? "Conversion funnel data available"
          : "No analytics snapshot for this date",
      data: {
        internal,
        insights,
        gsc,
        conversionOpt: convSnap.exists ? convSnap.data() : null,
        businessReport: bizSnap.exists ? bizSnap.data() : null,
        pendingApprovals: pendingBiz + pendingMkt,
      },
    },
    {
      agentId: "seo",
      status: seoLatest ? "ok" : "skipped",
      summary: seoLatest
        ? `Latest SEO report: ${seoLatest.id}`
        : "No SEO weekly report yet",
      data: seoLatest ? (seoLatest.data() as Record<string, unknown>) : {},
    },
    {
      agentId: "booking",
      status: "ok",
      summary: `${hotLeads} hot leads, ${abandoned} active recovery leads`,
      data: {
        hotLeads,
        abandoned,
        paymentFailed: internal.paymentFailed ?? 0,
        paymentDismissed: internal.paymentDismissed ?? 0,
        conversionIssues: convSnap.exists ? convSnap.data() : null,
      },
    },
    {
      agentId: "marketing",
      status: marketingSnap.exists ? "ok" : "skipped",
      summary: marketingSnap.exists
        ? String((marketingSnap.data() as { headline?: string }).headline ?? "Marketing report ready")
        : "Marketing engine has not run today",
      data: marketingSnap.exists ? (marketingSnap.data() as Record<string, unknown>) : {},
    },
    {
      agentId: "reputation",
      status: "ok",
      summary: `${approved.length} reviews, avg ${avgRating.toFixed(1)}★, ${lowRatings.length} low ratings`,
      data: { avgRating, total: approved.length, lowRatings: lowRatings.length, recent: approved.slice(0, 5) },
    },
    {
      agentId: "competitor",
      status: competitorLatest ? "ok" : "skipped",
      summary: competitorLatest ? "Competitor report available" : "No competitor scan yet",
      data: competitorLatest ? (competitorLatest.data() as Record<string, unknown>) : {},
    },
    {
      agentId: "pricing",
      status: "ok",
      summary: `${offersSnap.size} offers configured`,
      data: {
        offers: offersSnap.docs.map((d) => {
          const x = d.data() as Record<string, unknown>;
          return {
            id: d.id,
            title: x.title,
            discountPercent: x.discountPercent,
            active: x.active,
          };
        }),
        bookingConversionRatePct: internal.bookingConversionRatePct ?? 0,
        revenueInr: internal.bookingRevenueInr ?? 0,
      },
    },
  ];

  return snapshots;
}

export async function countPendingApprovals(): Promise<number> {
  const db = getAdminDb();
  if (!db) return 0;
  const [biz, mkt] = await Promise.all([
    db.collection("businessAgentActions").get(),
    db.collection("marketingAgentActions").get(),
  ]);
  return (
    biz.docs.filter((d) => (d.data() as { status?: string }).status === "pending_approval").length +
    mkt.docs.filter((d) => (d.data() as { status?: string }).status === "pending_approval").length
  );
}
