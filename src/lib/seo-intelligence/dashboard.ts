import { listCompetitors } from "./competitors";
import { listSeoIntelLogs } from "./activity-log";
import { getSerpProvider } from "./providers";
import { getSeoIntelSettings } from "./settings";
import { getAdminDb } from "@/lib/firebase-admin";
import { SEO_INTEL_COLLECTIONS } from "./collections";

export async function getSeoIntelDashboard() {
  const [settings, competitors, logs] = await Promise.all([
    getSeoIntelSettings(),
    listCompetitors({ includeBlocked: true }),
    listSeoIntelLogs(30),
  ]);

  const provider = getSerpProvider();
  const db = getAdminDb();

  let keywordCount = 0;
  let suggestionPending = 0;
  let suggestionApplied = 0;

  if (db) {
    try {
      const [kw, pending, applied] = await Promise.all([
        db.collection(SEO_INTEL_COLLECTIONS.keywords).select().get(),
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
      keywordCount = kw.size;
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

  return {
    settings,
    provider: {
      name: provider.name,
      configured: provider.isConfigured(),
    },
    disclaimer: settings.disclaimer,
    stats: {
      totalTrackedKeywords: keywordCount,
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
