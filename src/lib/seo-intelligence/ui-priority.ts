import type { SeoIntelPageMatchStatus, SeoIntelPriorityTone } from "./types";

/** Colour + label tokens — always pair with text badges (a11y). */
export const SEO_INTEL_TONE_CLASS: Record<
  SeoIntelPriorityTone,
  { badge: string; label: string }
> = {
  critical: {
    badge: "border-red-300 bg-red-50 text-red-900",
    label: "Critical",
  },
  high: {
    badge: "border-orange-300 bg-orange-50 text-orange-900",
    label: "High",
  },
  medium: {
    badge: "border-amber-300 bg-amber-50 text-amber-950",
    label: "Medium",
  },
  good: {
    badge: "border-emerald-300 bg-emerald-50 text-emerald-900",
    label: "Good",
  },
  info: {
    badge: "border-sky-300 bg-sky-50 text-sky-900",
    label: "Info",
  },
  strategic: {
    badge: "border-violet-300 bg-violet-50 text-violet-900",
    label: "Strategic",
  },
  neutral: {
    badge: "border-slate-300 bg-slate-50 text-slate-700",
    label: "Neutral",
  },
};

export function pageMatchTone(
  status: SeoIntelPageMatchStatus,
): SeoIntelPriorityTone {
  switch (status) {
    case "correct_page":
      return "good";
    case "related_page":
      return "info";
    case "wrong_page":
      return "high";
    case "no_page":
      return "critical";
    case "cannibalisation":
      return "strategic";
    case "not_indexed":
      return "high";
    case "weak_ranking":
      return "medium";
    default:
      return "neutral";
  }
}

export function pageMatchLabel(status: SeoIntelPageMatchStatus): string {
  switch (status) {
    case "correct_page":
      return "Correct page exists";
    case "related_page":
      return "Related page exists";
    case "wrong_page":
      return "Wrong page ranking";
    case "no_page":
      return "No page exists";
    case "cannibalisation":
      return "Keyword cannibalisation";
    case "not_indexed":
      return "Page not indexed";
    case "weak_ranking":
      return "Weak ranking";
    default:
      return "Insufficient data";
  }
}
