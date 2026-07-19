/** Preset date ranges for SEO health GSC / GA4 metrics (Asia/Kolkata). */

export type SeoHealthPeriodId =
  | "today"
  | "yesterday"
  | "7d"
  | "15d"
  | "28d"
  | "3m"
  | "6m"
  | "1y";

export type SeoHealthPeriod = {
  id: SeoHealthPeriodId;
  label: string;
  shortLabel: string;
};

export const SEO_HEALTH_PERIODS: SeoHealthPeriod[] = [
  { id: "today", label: "Today (IST)", shortLabel: "Today" },
  { id: "yesterday", label: "Yesterday (IST)", shortLabel: "Yesterday" },
  { id: "7d", label: "Last 7 days", shortLabel: "7 days" },
  { id: "15d", label: "Last 15 days", shortLabel: "15 days" },
  { id: "28d", label: "Last 28 days", shortLabel: "28 days" },
  { id: "3m", label: "Last 3 months", shortLabel: "3 months" },
  { id: "6m", label: "Last 6 months", shortLabel: "6 months" },
  { id: "1y", label: "Last 1 year", shortLabel: "1 year" },
];

export function isSeoHealthPeriodId(v: unknown): v is SeoHealthPeriodId {
  return SEO_HEALTH_PERIODS.some((p) => p.id === v);
}

function istYmd(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/** Inclusive IST calendar range for the preset. */
export function resolveSeoHealthPeriodRange(
  periodId: SeoHealthPeriodId,
  now = new Date(),
): { startDateIst: string; endDateIst: string; label: string; shortLabel: string } {
  const preset =
    SEO_HEALTH_PERIODS.find((p) => p.id === periodId) ?? SEO_HEALTH_PERIODS[2]!;
  const endIst = istYmd(now);
  const endParts = endIst.split("-").map(Number);
  const endLocal = new Date(endParts[0]!, endParts[1]! - 1, endParts[2]!);

  const startLocal = new Date(endLocal);
  switch (periodId) {
    case "today":
      break;
    case "yesterday":
      startLocal.setDate(startLocal.getDate() - 1);
      endLocal.setDate(endLocal.getDate() - 1);
      break;
    case "7d":
      startLocal.setDate(startLocal.getDate() - 6);
      break;
    case "15d":
      startLocal.setDate(startLocal.getDate() - 14);
      break;
    case "28d":
      startLocal.setDate(startLocal.getDate() - 27);
      break;
    case "3m":
      startLocal.setMonth(startLocal.getMonth() - 3);
      break;
    case "6m":
      startLocal.setMonth(startLocal.getMonth() - 6);
      break;
    case "1y":
      startLocal.setFullYear(startLocal.getFullYear() - 1);
      break;
    default:
      startLocal.setDate(startLocal.getDate() - 6);
  }

  const startDateIst = istYmd(startLocal);
  const endDateIst = istYmd(endLocal);
  return {
    startDateIst,
    endDateIst,
    label: preset.label,
    shortLabel: preset.shortLabel,
  };
}
