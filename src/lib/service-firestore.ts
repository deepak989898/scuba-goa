import type { ServiceItem, SubServiceItem } from "@/data/services";
import { parseFirestoreIncludes } from "@/lib/parse-firestore-includes";

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
  detailContent?: string;
  subServices?: SubServiceItem[];
};

function parseSubServices(raw: unknown): SubServiceItem[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const out: SubServiceItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const title = String(o.title ?? "").trim();
    if (!title) continue;
    const inc = parseFirestoreIncludes(o.includes);
    const desc = String(o.description ?? "").trim();
    const pf = o.priceFrom;
    out.push({
      title,
      description: desc || undefined,
      priceFrom:
        pf !== undefined && pf !== null && String(pf).trim() !== ""
          ? Number(pf)
          : undefined,
      includes: inc.length ? inc : undefined,
    });
  }
  return out.length ? out : undefined;
}

export function docToService(
  docId: string,
  data: Record<string, unknown>
): ServiceItem | null {
  const title = String(data.title ?? "");
  if (!title) return null;
  const includes = parseFirestoreIncludes(data.includes);
  const detailRaw = String(data.detailContent ?? "").trim();
  const subServices = parseSubServices(data.subServices);
  return {
    slug: docId,
    title,
    short: String(data.short ?? ""),
    priceFrom: Number(data.priceFrom ?? 0),
    image: String(data.image ?? "").trim(),
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
    detailContent: detailRaw || undefined,
    subServices,
  };
}

export function serviceToPayload(
  s: ServiceItem & { sortOrder?: number }
): ServiceFirestorePayload {
  const payload: ServiceFirestorePayload = {
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
  const d = (s.detailContent ?? "").trim();
  if (d) payload.detailContent = d;
  if (s.subServices?.length) {
    payload.subServices = s.subServices.map((sub) => {
      const row: SubServiceItem = { title: sub.title };
      const d = sub.description?.trim();
      if (d) row.description = d;
      if (sub.priceFrom != null && Number.isFinite(sub.priceFrom)) {
        row.priceFrom = sub.priceFrom;
      }
      if (sub.includes?.length) row.includes = sub.includes;
      return row;
    });
  }
  return payload;
}
