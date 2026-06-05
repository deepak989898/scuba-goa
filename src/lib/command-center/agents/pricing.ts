import { getAdminDb } from "@/lib/firebase-admin";
import { buildBlogCatalogContext } from "@/lib/blog-automation/catalog-context";
import type { AgentSnapshot } from "@/lib/command-center/types";

export async function runPricingAgent(): Promise<AgentSnapshot> {
  const db = getAdminDb();
  if (!db) {
    return {
      agentId: "pricing",
      status: "error",
      summary: "Firebase not configured",
      data: {},
    };
  }

  const [offersSnap, aiSnap, catalog] = await Promise.all([
    db.collection("offers").get(),
    db.collection("aiAnalyticsDaily").limit(7).get(),
    buildBlogCatalogContext(),
  ]);

  const sorted = [...aiSnap.docs].sort((a, b) => b.id.localeCompare(a.id));
  const ai = sorted[0]?.data() as Record<string, unknown> | undefined;
  const internal = (ai?.internal ?? {}) as Record<string, unknown>;

  const offers = offersSnap.docs
    .map((d) => {
      const x = d.data() as Record<string, unknown>;
      return {
        id: d.id,
        title: String(x.title ?? ""),
        promoCode: String(x.promoCode ?? ""),
        discountPercent: Number(x.discountPercent ?? 0),
        active: x.active !== false,
      };
    })
    .filter((o) => o.active);

  const conversionRate = Number(internal.bookingConversionRatePct ?? 0);
  const paymentFailed = Number(internal.paymentFailed ?? 0);
  const revenue = Number(internal.bookingRevenueInr ?? 0);

  const suggestions: string[] = [];
  if (conversionRate < 2 && offers.length === 0)
    suggestions.push("Low conversion with no active promos — create a limited-time scuba package offer");
  if (paymentFailed >= 3)
    suggestions.push("High payment failures — test smaller deposit option or UPI-first messaging");
  if (offers.length > 0 && conversionRate < 3)
    suggestions.push("Promote top offer on /booking hero and WhatsApp recovery messages");
  suggestions.push("Monsoon (Jun–Sep): bundle scuba + North Goa tour at combo discount");
  suggestions.push("Peak season (Oct–Feb): premium Grand Island package with early-bird 10% off");

  return {
    agentId: "pricing",
    status: "ok",
    summary: `${offers.length} active offers, ${conversionRate}% booking conversion`,
    data: {
      offers,
      conversionRatePct: conversionRate,
      paymentFailed,
      revenueInr: revenue,
      catalogPackages: catalog.packages.length,
      suggestions,
    },
  };
}
