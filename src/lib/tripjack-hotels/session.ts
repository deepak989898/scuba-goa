/** Client sessionStorage keys for hotel checkout continuity (15–45 min TTL). */

export const HOTEL_SESSION_KEYS = {
  searchRequest: "hotel_search_request",
  listingResponse: "hotel_listing_response",
  searchContext: "hotel_search_context",
  selectedId: "hotel_selected_id",
  selectedOption: "hotel_selected_option",
  reviewPrep: "hotel_review_prep",
  reviewResponse: "hotel_review_response",
  guestDetails: "hotel_guest_details",
  confirmedBooking: "hotel_confirmed_booking",
  draftBookingId: "hotel_draft_booking_id",
} as const;

const TTL_MS = 45 * 60 * 1000;

type Stored<T> = { v: T; exp: number };

function wrap<T>(value: T): Stored<T> {
  return { v: value, exp: Date.now() + TTL_MS };
}

function unwrap<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Stored<T>;
    if (!parsed || typeof parsed !== "object") return null;
    if (Date.now() > Number(parsed.exp)) return null;
    return parsed.v;
  } catch {
    return null;
  }
}

export function hotelSessionGet<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  return unwrap<T>(sessionStorage.getItem(key));
}

export function hotelSessionSet<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(key, JSON.stringify(wrap(value)));
}

export function hotelSessionRemove(key: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(key);
}

export function hotelSessionClearCheckout(): void {
  if (typeof window === "undefined") return;
  const keys = Object.values(HOTEL_SESSION_KEYS);
  for (const k of keys) {
    if (k !== HOTEL_SESSION_KEYS.searchRequest) sessionStorage.removeItem(k);
  }
}
