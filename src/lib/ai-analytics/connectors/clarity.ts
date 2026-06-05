import type { ClarityDailySnapshot } from "@/lib/ai-analytics/types";

/**
 * Microsoft Clarity has no public REST API for daily metrics.
 * Deep links like /projects/view/{id} break with "Confirmation Type not supported"
 * — use the main dashboard URL and show project ID for manual selection.
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
    /** Always use main Clarity home — admin picks project after sign-in. */
    dashboardUrl: "https://clarity.microsoft.com/",
    note: projectId
      ? `Clarity is active on ${site} (project ID: ${projectId}). Sign in at clarity.microsoft.com, then open your "${site}" project from the list. Do not use /projects/view/ links — they error in Microsoft UI.`
      : "Set NEXT_PUBLIC_CLARITY_PROJECT_ID to enable Clarity on the site.",
  };
}
