import { getAdminDb } from "@/lib/firebase-admin";
import type { MarketingAnalyticsDoc } from "@/lib/marketing-engine/types";

export async function buildMarketingAnalytics(
  dateIst: string,
): Promise<MarketingAnalyticsDoc> {
  const db = getAdminDb();
  const now = new Date().toISOString();

  if (!db) {
    return {
      dateIst,
      generatedAt: now,
      traffic: { pageViews: 0, sessions: 0 },
      conversions: { bookings: 0, checkoutStarted: 0, paymentFailed: 0 },
      leads: { marketingLeads: 0, hotRecoveryLeads: 0, whatsappClicks: 0 },
      seo: {},
      content: { blogsPublished7d: 0, campaignsActive: 0 },
    };
  }

  const [aiSnap, leadsSnap, recoverySnap, campaignsSnap, blogsSnap] = await Promise.all([
    db.collection("aiAnalyticsDaily").doc(dateIst).get(),
    db.collection("marketingLeads").limit(500).get(),
    db.collection("recoveryLeads").limit(300).get(),
    db.collection("marketingCampaigns").where("status", "in", ["scheduled", "approved", "published"]).limit(50).get().catch(() => null),
    db.collection("blogPosts").limit(30).get(),
  ]);

  const ai = aiSnap.exists ? (aiSnap.data() as Record<string, unknown>) : null;
  const internal = (ai?.internal ?? {}) as Record<string, unknown>;
  const insights = (ai?.insights ?? {}) as Record<string, unknown>;

  const hotRecovery = recoverySnap.docs.filter(
    (d) => (d.data() as { temperature?: string }).temperature === "hot",
  ).length;

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const blogs7d = blogsSnap.docs.filter((d) => {
    const pub = String((d.data() as { publishedAt?: string }).publishedAt ?? "");
    return pub && new Date(pub).getTime() >= weekAgo;
  }).length;

  let whatsappClicks = 0;
  const journey = (insights as { journeyTotals?: Record<string, number> }).journeyTotals;
  if (journey?.whatsappClicks != null) whatsappClicks = Number(journey.whatsappClicks);

  return {
    dateIst,
    generatedAt: now,
    traffic: {
      pageViews: Number(internal.pageViews ?? 0),
      sessions: Number(internal.sessions ?? 0),
    },
    conversions: {
      bookings: Number(internal.bookings ?? 0),
      checkoutStarted: Number(internal.checkoutStarted ?? 0),
      paymentFailed: Number(internal.paymentFailed ?? 0),
    },
    leads: {
      marketingLeads: leadsSnap.size,
      hotRecoveryLeads: hotRecovery,
      whatsappClicks,
    },
    seo: {
      topQueries: [],
      weeklyIssues: 0,
    },
    content: {
      blogsPublished7d: blogs7d,
      campaignsActive: campaignsSnap?.size ?? 0,
    },
  };
}
