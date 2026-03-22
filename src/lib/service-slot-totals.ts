import type { ServiceItem } from "@/data/services";

/**
 * If any sub-service defines slots, sums those; otherwise uses the parent service.
 */
export function getAggregatedServiceSlots(s: ServiceItem): {
  slotsLeft?: number;
  bookedToday?: number;
  /** True when totals come from summing sub-services */
  fromSubServices: boolean;
} {
  const subs = s.subServices ?? [];
  const lefts = subs
    .map((sub) => sub.slotsLeft)
    .filter((v): v is number => v != null && Number.isFinite(v));
  const books = subs
    .map((sub) => sub.bookedToday)
    .filter((v): v is number => v != null && Number.isFinite(v));

  if (lefts.length > 0 || books.length > 0) {
    return {
      slotsLeft: lefts.length > 0 ? lefts.reduce((a, b) => a + b, 0) : undefined,
      bookedToday:
        books.length > 0 ? books.reduce((a, b) => a + b, 0) : undefined,
      fromSubServices: true,
    };
  }

  return {
    slotsLeft: s.slotsLeft,
    bookedToday: s.bookedToday,
    fromSubServices: false,
  };
}
