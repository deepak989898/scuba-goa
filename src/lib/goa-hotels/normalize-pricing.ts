import type { GoaHotelDoc, GoaHotelRoom } from "./types";

export const DEFAULT_HOTEL_ROOM_ID = "standard";

/** Parse INR amounts from Firestore (number or string). */
export function parseHotelPrice(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    return Math.round(raw);
  }
  if (typeof raw === "string") {
    const cleaned = raw.replace(/[^\d.]/g, "");
    const n = Number(cleaned);
    if (Number.isFinite(n) && n > 0) return Math.round(n);
  }
  return 0;
}

function pickRoomPrice(o: Record<string, unknown>): number {
  const keys = [
    "pricePerNight",
    "perNightPrice",
    "nightlyPrice",
    "nightlyRate",
    "price",
    "roomPrice",
    "basePrice",
    "totalPrice",
    "totalAmount",
    "amount",
    "finalPrice",
    "netPrice",
    "sellingPrice",
  ];
  for (const key of keys) {
    const n = parseHotelPrice(o[key]);
    if (n > 0) return n;
  }
  return 0;
}

function pickRoomName(o: Record<string, unknown>, fallback: string): string {
  const name = String(
    o.name ?? o.roomName ?? o.standardRoomName ?? o.title ?? o.label ?? "",
  ).trim();
  return name || fallback;
}

function pickMealBasisLabel(o: Record<string, unknown>): string {
  return String(
    o.mealBasisLabel ??
      o.mealBasisName ??
      o.mealPlan ??
      o.mealBasis ??
      o.boardBasis ??
      "",
  ).trim();
}

function normalizeImageUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
}

function normalizeStringList(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((x) => String(x)).filter(Boolean);
  }
  if (raw && typeof raw === "object") {
    return Object.values(raw as Record<string, unknown>)
      .map((x) => String(x))
      .filter(Boolean);
  }
  return [];
}

function mapRoomRow(
  key: string,
  o: Record<string, unknown>,
  index: number,
  fallbackPrice: number,
): GoaHotelRoom | null {
  const id = String(o.id ?? o.roomId ?? key ?? `room-${index}`).trim();
  if (!id) return null;

  let pricePerNight = pickRoomPrice(o);
  if (pricePerNight <= 0 && fallbackPrice > 0) {
    pricePerNight = fallbackPrice;
  }
  if (pricePerNight <= 0) return null;

  const inclusionsRaw = o.inclusions;
  let inclusions: string[] = [];
  if (Array.isArray(inclusionsRaw)) {
    inclusions = inclusionsRaw.map((x) => String(x));
  } else if (inclusionsRaw && typeof inclusionsRaw === "object") {
    inclusions = normalizeStringList(inclusionsRaw);
  }

  const refundableRaw = o.isRefundable ?? o.refundable ?? o.cancellationPolicy;
  const isRefundable =
    refundableRaw === true ||
    String(refundableRaw ?? "").toLowerCase().includes("refund");

  return {
    id,
    name: pickRoomName(o, "Room"),
    type: String(o.type ?? o.roomType ?? o.category ?? ""),
    mealBasis: String(o.mealBasis ?? o.mealPlan ?? ""),
    mealBasisLabel: pickMealBasisLabel(o),
    pricePerNight,
    totalPrice: parseHotelPrice(o.totalPrice) || pricePerNight,
    basePrice: parseHotelPrice(o.basePrice) || pricePerNight,
    taxes: parseHotelPrice(o.taxes),
    currency: String(o.currency ?? "INR"),
    maxGuests: Math.max(1, Number(o.maxGuests ?? o.maxOccupancy ?? o.occupancy ?? 2)),
    available: o.available !== false && o.soldOut !== true,
    isRefundable,
    inclusions,
    images: normalizeImageUrls(o.images ?? o.imageUrls),
  };
}

function flattenRoomEntries(raw: unknown): { key: string; data: Record<string, unknown> }[] {
  const rows: { key: string; data: Record<string, unknown> }[] = [];

  const pushRow = (key: string, value: unknown) => {
    if (!value || typeof value !== "object") return;
    const o = value as Record<string, unknown>;

    const nestedPlans = o.ratePlans ?? o.options ?? o.plans ?? o.rates;
    if (Array.isArray(nestedPlans) && nestedPlans.length > 0) {
      nestedPlans.forEach((plan, i) => {
        if (plan && typeof plan === "object") {
          const merged = { ...o, ...(plan as Record<string, unknown>) };
          rows.push({
            key: String(
              (plan as Record<string, unknown>).id ??
                (plan as Record<string, unknown>).roomId ??
                `${key}-plan-${i}`,
            ),
            data: merged,
          });
        }
      });
      return;
    }

    rows.push({ key, data: o });
  };

  if (Array.isArray(raw)) {
    raw.forEach((r, i) => pushRow(String(i), r));
  } else if (raw && typeof raw === "object") {
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      pushRow(key, value);
    }
  }

  return rows;
}

export function normalizeHotelRooms(
  raw: unknown,
  priceFrom = 0,
): GoaHotelRoom[] {
  const rows = flattenRoomEntries(raw);
  const rooms = rows
    .map(({ key, data }, index) => mapRoomRow(key, data, index, priceFrom))
    .filter((r): r is GoaHotelRoom => Boolean(r && r.available));

  if (rooms.length > 0) return rooms;

  if (priceFrom > 0) {
    return [buildDefaultHotelRoom(priceFrom)];
  }

  return [];
}

export function buildDefaultHotelRoom(pricePerNight: number): GoaHotelRoom {
  const nightly = Math.round(pricePerNight);
  return {
    id: DEFAULT_HOTEL_ROOM_ID,
    name: "Standard Room",
    type: "Standard",
    mealBasis: "",
    mealBasisLabel: "Room only",
    pricePerNight: nightly,
    totalPrice: nightly,
    basePrice: nightly,
    taxes: 0,
    currency: "INR",
    maxGuests: 2,
    available: true,
    isRefundable: false,
    inclusions: [],
    images: [],
  };
}

export function minRoomPricePerNight(rooms: GoaHotelRoom[]): number {
  const prices = rooms.map((r) => r.pricePerNight).filter((p) => p > 0);
  return prices.length > 0 ? Math.min(...prices) : 0;
}

export function resolveHotelPriceFrom(
  raw: Record<string, unknown>,
  rooms: GoaHotelRoom[],
): number {
  const fromDoc = parseHotelPrice(
    raw.priceFrom ?? raw.price_from ?? raw.minPrice ?? raw.startingPrice,
  );
  if (fromDoc > 0) return fromDoc;
  return minRoomPricePerNight(rooms);
}

export function getHotelDisplayPriceFrom(hotel: GoaHotelDoc): number {
  if (hotel.priceFrom > 0) return hotel.priceFrom;
  return minRoomPricePerNight(hotel.rooms);
}
