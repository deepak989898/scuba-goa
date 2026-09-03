import type { HotelRoomOption } from "./types";

/** Parse TripJack pricing/listing responses into room options (flexible shapes). */

function num(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function dig(obj: unknown, ...keys: string[]): unknown {
  let cur: unknown = obj;
  for (const k of keys) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur;
}

export function extractRoomOptionsFromPricing(raw: unknown): HotelRoomOption[] {
  const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const candidates: unknown[] = [];

  const pushArr = (v: unknown) => {
    if (Array.isArray(v)) candidates.push(...v);
  };

  pushArr(root.options);
  pushArr(root.roomOptions);
  pushArr(root.rooms);
  pushArr(dig(root, "data", "options"));
  pushArr(dig(root, "data", "roomOptions"));
  pushArr(dig(root, "result", "options"));
  pushArr(dig(root, "hotel", "options"));

  if (Array.isArray(root.hotels)) {
    for (const h of root.hotels) {
      if (h && typeof h === "object") {
        const ho = h as Record<string, unknown>;
        pushArr(ho.options);
        pushArr(ho.roomOptions);
      }
    }
  }

  const out: HotelRoomOption[] = [];
  for (let i = 0; i < candidates.length; i++) {
    const row = candidates[i];
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const optionId = String(
      o.optionId ?? o.id ?? o.rid ?? o.roomId ?? `opt_${i}`,
    );
    const roomName = String(
      o.roomName ?? o.name ?? o.roomType ?? o.rt ?? "Room",
    ).trim();
    const totalFare =
      num(o.totalFare) ??
      num(o.tf) ??
      num(o.totalPrice) ??
      num(o.price) ??
      num(o.amount) ??
      0;
    if (!totalFare || totalFare <= 0) continue;

    out.push({
      optionId,
      roomName,
      mealBasis: String(o.mealBasis ?? o.mb ?? o.mealPlan ?? "").trim() || undefined,
      refundable: Boolean(o.refundable ?? o.isRefundable),
      cancellationText:
        typeof o.cancellationText === "string"
          ? o.cancellationText
          : typeof o.cancellationPolicy === "string"
            ? o.cancellationPolicy
            : undefined,
      totalFare: Math.round(totalFare),
      currency: String(o.currency ?? "INR"),
      raw: o,
    });
  }

  return out.sort((a, b) => a.totalFare - b.totalFare);
}

export function extractMinPriceFromListing(raw: unknown): number | undefined {
  const opts = extractRoomOptionsFromPricing(raw);
  if (opts.length) return opts[0].totalFare;

  const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const direct =
    num(root.minPrice) ??
    num(root.priceFrom) ??
    num(dig(root, "data", "minPrice"));
  return direct && direct > 0 ? Math.round(direct) : undefined;
}

export function extractReviewBookingId(raw: unknown): string | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const id =
    o.bookingId ??
    o.reviewBookingId ??
    dig(o, "data", "bookingId") ??
    dig(o, "result", "bookingId");
  return typeof id === "string" && id.trim() ? id.trim() : undefined;
}

export function customerSafeHotelError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/tripjack|proxy|api key|env|firebase|firestore/i.test(msg)) {
    return "We could not refresh live hotel prices right now. Showing our last saved rates.";
  }
  return msg.length > 160 ? "Something went wrong. Please try again." : msg;
}
