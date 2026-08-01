import { listCompetitors } from "./competitors";
import { listSeoIntelLogs } from "./activity-log";
import { listKeywords } from "./keywords-store";
import { getSerpProvider } from "./providers";
import { getSeoIntelSettings } from "./settings";
import { getAdminDb } from "@/lib/firebase-admin";
import { SEO_INTEL_COLLECTIONS } from "./collections";

export async function getSeoIntelDashboard() {
  const [settings, competitors, logs, keywords] = await Promise.all([
    getSeoIntelSettings(),
    listCompetitors({ includeBlocked: true }),
    listSeoIntelLogs(30),
    listKeywords({ status: "active" }),
  ]);

  const provider = getSerpProvider();
  const db = getAdminDb();

  let suggestionPending = 0;
  let suggestionApplied = 0;

  if (db) {
    try {
      const [pending, applied] = await Promise.all([
        db
          .collection(SEO_INTEL_COLLECTIONS.suggestions)
          .where("status", "==", "pending_approval")
          .select()
          .get(),
        db
          .collection(SEO_INTEL_COLLECTIONS.suggestions)
          .where("status", "==", "applied")
          .select()
          .get(),
      ]);
      suggestionPending = pending.size;
      suggestionApplied = applied.size;
    } catch {
      // collections may be empty / index missing
    }
  }

  const pendingCompetitors = competitors.filter(
    (c) => c.status === "pending_review",
  ).length;
  const approvedCompetitors = competitors.filter(
    (c) => c.status === "approved" && !c.paused,
  ).length;
  const marketplace = competitors.filter((c) => c.type === "marketplace").length;
  const direct = competitors.filter((c) => c.type === "direct_local").length;

  const pos = (min: number, max: number) =>
    keywords.filter(
      (k) =>
        k.myPosition != null &&
        k.myPosition >= min &&
        k.myPosition <= max,
    ).length;
  const missingPages = keywords.filter(
    (k) => k.pageMatchStatus === "no_page",
  ).length;
  const cannibalisation = keywords.filter(
    (k) => k.pageMatchStatus === "cannibalisation",
  ).length;
  const notRanking = keywords.filter(
    (k) => k.myPosition == null || k.myPosition <= 0,
  ).length;

  return {
    settings,
    provider: {
      name: provider.name,
      configured: provider.isConfigured(),
    },
    disclaimer: settings.disclaimer,
    stats: {
      totalTrackedKeywords: keywords.length,
      position1to3: pos(1, 3),
      position4to10: pos(4, 10),
      position11to20: pos(11, 20),
      position21to50: pos(21, 50),
      positionBelow50: keywords.filter(
        (k) => k.myPosition != null && k.myPosition > 50,
      ).length,
      notRanking,
      missingPages,
      cannibalisation,
      competitorsTracked: approvedCompetitors,
      competitorsPending: pendingCompetitors,
      competitorsTotal: competitors.length,
      marketplaceCompetitors: marketplace,
      directLocalCompetitors: direct,
      pendingSuggestions: suggestionPending,
      appliedChanges: suggestionApplied,
      autoApproveOn: settings.suggestionAutoApprove,
      automationPaused: settings.automationPaused,
    },
    recentLogs: logs,
  };
}
