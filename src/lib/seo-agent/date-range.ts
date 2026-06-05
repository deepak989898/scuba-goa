import { istDateString } from "@/lib/ai-analytics/ist";

function addDaysIst(dateIst: string, deltaDays: number): string {
  // dateIst is YYYY-MM-DD; interpret as IST midnight.
  const base = new Date(`${dateIst}T00:00:00+05:30`);
  const d = new Date(base.getTime() + deltaDays * 86400000);
  return istDateString(d);
}

/**
 * Returns [start, end] inclusive for a period ending at `endDateIst`
 * with `days` length. Example: days=7 gives a 7-day window.
 */
export function periodEnding(endDateIst: string, days: number): { start: string; end: string } {
  const safeDays = Math.min(28, Math.max(2, Math.floor(days)));
  const start = addDaysIst(endDateIst, -(safeDays - 1));
  return { start, end: endDateIst };
}

/** Returns the immediately previous period with same length. */
export function previousPeriod(
  startDateIst: string,
  endDateIst: string,
): { start: string; end: string; days: number } {
  const days =
    Math.round(
      (new Date(`${endDateIst}T00:00:00+05:30`).getTime() -
        new Date(`${startDateIst}T00:00:00+05:30`).getTime()) /
        86400000,
    ) + 1;
  const prevEnd = addDaysIst(startDateIst, -1);
  const prevStart = addDaysIst(prevEnd, -(days - 1));
  return { start: prevStart, end: prevEnd, days };
}

