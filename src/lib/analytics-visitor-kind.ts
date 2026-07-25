import { resolveIsBot } from "@/lib/analytics-bot";

export type AdminVisitorKind = "human" | "suspected" | "bot" | "internal" | "unknown";

/**
 * Classify a session for admin tabs. Legacy (pre-v2) zero-engagement
 * Linux/Chrome "Google" hits are treated as suspected.
 */
export function resolveAdminVisitorKind(input: {
  isBot?: boolean;
  visitorType?: string;
  uaSnippet?: string;
  deviceLabel?: string;
  trafficChannel?: string;
  sourceConfidence?: string;
  totalDurationMs?: number;
  pageViews?: number;
  interactionCount?: number;
  analyticsVersion?: number;
}): AdminVisitorKind {
  // Prefer stored visitorType over re-sniffing UA — WhatsApp in-app UAs used to
  // false-positive as bots even after engagement was recorded.
  const vt = (input.visitorType ?? "").toLowerCase();
  if (vt === "human") return "human";
  if (vt === "internal") return "internal";
  if (vt === "suspected_bot") return "suspected";
  if (vt === "bot" || resolveIsBot(input.isBot, input.uaSnippet ?? "")) {
    return "bot";
  }

  // Engaged sessions (clicks / multi-page / dwell) → human even if type is unknown
  if (
    (input.totalDurationMs ?? 0) >= 3000 ||
    (input.pageViews ?? 0) >= 2 ||
    (input.interactionCount ?? 0) > 0
  ) {
    return "human";
  }

  // Legacy heuristic for pre-v2 inflation pattern
  const label = (input.deviceLabel ?? "").toLowerCase();
  const linuxChrome =
    label.includes("linux") && label.includes("chrome") && label.includes("desktop");
  const zeroEng =
    (input.totalDurationMs ?? 0) < 2000 && (input.pageViews ?? 1) <= 1;
  const googleish = input.trafficChannel === "google_organic";
  const lowConf =
    !input.sourceConfidence ||
    input.sourceConfidence === "low" ||
    input.sourceConfidence === "unknown" ||
    input.sourceConfidence === "medium";

  if (zeroEng && (linuxChrome || (googleish && lowConf))) {
    return "suspected";
  }
  if ((input.analyticsVersion ?? 1) < 2 && zeroEng && googleish) {
    return "suspected";
  }
  // Provisional / unknown first-paint visits still show under Humans so we
  // don't under-count vs GA4 / Clarity.
  return "human";
}

export function matchesAdminVisitorKind(
  kind: AdminVisitorKind,
  filter: "human" | "suspected" | "bot" | "all",
): boolean {
  if (filter === "all") return true;
  // Provisional "unknown" first-paint visits count with humans (GA4/Clarity parity).
  if (filter === "human") return kind === "human" || kind === "unknown";
  if (filter === "suspected") return kind === "suspected";
  if (filter === "bot") return kind === "bot";
  return true;
}
