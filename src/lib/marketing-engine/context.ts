import { getAdminDb } from "@/lib/firebase-admin";
import { buildBlogCatalogContext } from "@/lib/blog-automation/catalog-context";
import { istYesterdayString } from "@/lib/ai-analytics/ist";

export type MarketingContext = {
  dateIst: string;
  catalogText: string;
  analytics: Record<string, unknown> | null;
  conversion: Record<string, unknown> | null;
  seoReport: Record<string, unknown> | null;
  marketingLeadsCount: number;
  recoveryHotLeads: number;
  activeOffers: { code: string; discountPct: number; label?: string }[];
  recentBlogTitles: string[];
};

export async function buildMarketingContext(dateIst?: string): Promise<MarketingContext> {
  const db = getAdminDb();
  const day = dateIst?.trim() || istYesterdayString();

  const catalog = await buildBlogCatalogContext();

  if (!db) {
    return {
      dateIst: day,
      catalogText: catalog.textBlock,
      analytics: null,
      conversion: null,
      seoReport: null,
      marketingLeadsCount: 0,
      recoveryHotLeads: 0,
      activeOffers: [],
      recentBlogTitles: [],
    };
  }

  const weekId = day;
  const [aiSnap, convSnap, seoSnap, leadsSnap, recoverySnap, offersSnap, blogsSnap] =
    await Promise.all([
      db.collection("aiAnalyticsDaily").doc(day).get(),
      db.collection("conversionOptDaily").doc(day).get(),
      db.collection("seoWeeklyReports").doc(weekId).get().catch(() => null),
      db.collection("marketingLeads").limit(500).get(),
      db.collection("recoveryLeads").limit(300).get(),
      db.collection("offers").where("active", "==", true).limit(20).get().catch(() => null),
      db.collection("blogPosts").orderBy("publishedAt", "desc").limit(15).get().catch(() => null),
    ]);

  let seoReport: Record<string, unknown> | null = null;
  if (!seoSnap?.exists) {
    const seoAll = await db.collection("seoWeeklyReports").limit(5).get();
    const sorted = [...seoAll.docs].sort((a, b) => b.id.localeCompare(a.id));
    seoReport = sorted[0]?.data() as Record<string, unknown> ?? null;
  } else {
    seoReport = seoSnap.data() as Record<string, unknown>;
  }

  const recoveryHot = recoverySnap.docs.filter(
    (d) => (d.data() as { temperature?: string }).temperature === "hot",
  ).length;

  const activeOffers =
    offersSnap?.docs.map((d) => {
      const x = d.data() as { code?: string; discountPct?: number; label?: string };
      return {
        code: String(x.code ?? d.id),
        discountPct: Number(x.discountPct ?? 0),
        label: x.label,
      };
    }) ?? [];

  const recentBlogTitles =
    blogsSnap?.docs.map((d) => String((d.data() as { title?: string }).title ?? "")).filter(Boolean) ??
    [];

  return {
    dateIst: day,
    catalogText: catalog.textBlock,
    analytics: aiSnap.exists ? (aiSnap.data() as Record<string, unknown>) : null,
    conversion: convSnap.exists ? (convSnap.data() as Record<string, unknown>) : null,
    seoReport,
    marketingLeadsCount: leadsSnap.size,
    recoveryHotLeads: recoveryHot,
    activeOffers,
    recentBlogTitles,
  };
}
