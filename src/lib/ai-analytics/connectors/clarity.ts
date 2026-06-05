import type { ClarityDailySnapshot } from "@/lib/ai-analytics/types";

/**
 * Microsoft Clarity has no public REST API for daily metrics export.
 * We record project config and link admins to the dashboard for session replay.
 */
export function buildClaritySnapshot(): ClarityDailySnapshot {
  const projectId = (process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || "").trim();
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://bookscubagoa.com").replace(
    /\/$/,
    "",
  );
  return {
    configured: Boolean(projectId),
    projectId,
    dashboardUrl: projectId
      ? `https://clarity.microsoft.com/projects/view/${projectId}`
      : "https://clarity.microsoft.com",
    note: projectId
      ? `Clarity project ${projectId} is active on ${site}. Use the dashboard for heatmaps and session recordings; daily metrics come from internal Firestore + GA4.`
      : "Set NEXT_PUBLIC_CLARITY_PROJECT_ID to enable Clarity on the site.",
  };
}
