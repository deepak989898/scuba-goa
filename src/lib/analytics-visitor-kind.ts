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
  analyticsVersion?: number;
}): AdminVisitorKind {
  if (resolveIsBot(input.isBot, input.uaSnippet ?? "")) return "bot";
  const vt = (input.visitorType ?? "").toLowerCase();
  if (vt === "bot") return "bot";
  if (vt === "internal") return "internal";
  if (vt === "suspected_bot") return "suspected";
  if (vt === "human") return "human";

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
  return "human";
}

export function matchesAdminVisitorKind(
  kind: AdminVisitorKind,
  filter: "human" | "suspected" | "bot" | "all",
): boolean {
  if (filter === "all") return true;
  if (filter === "human") return kind === "human";
  if (filter === "suspected") return kind === "suspected" || kind === "unknown";
  if (filter === "bot") return kind === "bot";
  return true;
}
