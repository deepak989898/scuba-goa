import type { ServiceItem } from "@/data/services";

export type ServiceFirestorePayload = {
  title: string;
  short: string;
  priceFrom: number;
  image: string;
  duration: string;
  rating: number;
  includes: string[];
  slotsLeft?: number;
  bookedToday?: number;
  limitedSlots?: boolean;
  mostBooked?: boolean;
  /** Sort order on site (lower first) */
  sortOrder: number;
};

export function docToService(
  docId: string,
  data: Record<string, unknown>
): ServiceItem | null {
  const title = String(data.title ?? "");
  if (!title) return null;
  const includes = Array.isArray(data.includes)
    ? (data.includes as string[])
    : [];
  return {
    slug: docId,
    title,
    short: String(data.short ?? ""),
    priceFrom: Number(data.priceFrom ?? 0),
    image: String(data.image ?? ""),
    duration: String(data.duration ?? ""),
    rating: Number(data.rating ?? 4.8),
    includes,
    slotsLeft:
      data.slotsLeft !== undefined ? Number(data.slotsLeft) : undefined,
    bookedToday:
      data.bookedToday !== undefined ? Number(data.bookedToday) : undefined,
    limitedSlots: Boolean(data.limitedSlots),
    mostBooked: Boolean(data.mostBooked),
    sortOrder:
      data.sortOrder !== undefined ? Number(data.sortOrder) : undefined,
  };
}

export function serviceToPayload(s: ServiceItem & { sortOrder?: number }): ServiceFirestorePayload {
  return {
    title: s.title,
    short: s.short,
    priceFrom: s.priceFrom,
    image: s.image,
    duration: s.duration,
    rating: s.rating,
    includes: s.includes,
    slotsLeft: s.slotsLeft,
    bookedToday: s.bookedToday,
    limitedSlots: s.limitedSlots,
    mostBooked: s.mostBooked,
    sortOrder: s.sortOrder ?? 0,
  };
}
