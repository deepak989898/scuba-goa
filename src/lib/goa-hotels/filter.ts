import type { GoaHotelDoc } from "./types";

export const HOTELS_PAGE_SIZE = 20;

export type HotelSort = "name" | "price-asc" | "price-desc";

export type HotelListFilters = {
  q?: string;
  sort?: HotelSort;
  minPrice?: number;
  maxPrice?: number;
};

export const GOA_HOTEL_AREA_SUGGESTIONS = [
  "Baga",
  "Calangute",
  "Candolim",
  "Panjim",
  "Anjuna",
  "Arambol",
  "Margao",
  "Vagator",
  "Morjim",
  "Colva",
] as const;

function hotelSearchText(h: GoaHotelDoc): string {
  return [h.name, h.location, h.locality, h.address, h.cityName, h.slug]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function parseHotelSort(raw: string | undefined): HotelSort {
  if (raw === "price-asc" || raw === "price-desc") return raw;
  return "name";
}

export function parsePriceFilter(raw: string | undefined): number | undefined {
  const n = Number.parseInt(String(raw ?? "").trim(), 10);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

export function filterAndSortHotels(
  hotels: GoaHotelDoc[],
  filters: HotelListFilters,
): GoaHotelDoc[] {
  let list = [...hotels];

  const q = filters.q?.trim().toLowerCase();
  if (q) {
    list = list.filter((h) => hotelSearchText(h).includes(q));
  }

  const min = filters.minPrice;
  const max = filters.maxPrice;
  if (min !== undefined && min > 0) {
    list = list.filter((h) => h.priceFrom > 0 && h.priceFrom >= min);
  }
  if (max !== undefined && max > 0) {
    list = list.filter((h) => h.priceFrom > 0 && h.priceFrom <= max);
  }

  const sort = filters.sort ?? "name";
  list.sort((a, b) => {
    if (sort === "price-asc") {
      if (a.priceFrom <= 0 && b.priceFrom <= 0) return a.name.localeCompare(b.name);
      if (a.priceFrom <= 0) return 1;
      if (b.priceFrom <= 0) return -1;
      return a.priceFrom - b.priceFrom || a.name.localeCompare(b.name);
    }
    if (sort === "price-desc") {
      if (a.priceFrom <= 0 && b.priceFrom <= 0) return a.name.localeCompare(b.name);
      if (a.priceFrom <= 0) return 1;
      if (b.priceFrom <= 0) return -1;
      return b.priceFrom - a.priceFrom || a.name.localeCompare(b.name);
    }
    return a.name.localeCompare(b.name);
  });

  return list;
}

export function hotelsListQueryParams(filters: {
  q?: string;
  sort?: HotelSort;
  min?: string;
  max?: string;
}): Record<string, string> {
  const out: Record<string, string> = {};
  const q = filters.q?.trim();
  if (q) out.q = q;
  if (filters.sort && filters.sort !== "name") out.sort = filters.sort;
  const min = filters.min?.trim();
  const max = filters.max?.trim();
  if (min) out.min = min;
  if (max) out.max = max;
  return out;
}
