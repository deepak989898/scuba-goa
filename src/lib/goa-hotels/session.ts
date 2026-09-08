"use client";

import type { HotelBookingDraft } from "./types";

export const HOTEL_SESSION_KEYS = {
  draft: "bsg-hotel-booking-draft",
  bookingId: "bsg-hotel-booking-id",
} as const;

export function hotelSessionGet<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function hotelSessionSet(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(key, JSON.stringify(value));
}

export function hotelSessionClear(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(HOTEL_SESSION_KEYS.draft);
  sessionStorage.removeItem(HOTEL_SESSION_KEYS.bookingId);
}

export function getHotelBookingDraft(): HotelBookingDraft | null {
  return hotelSessionGet<HotelBookingDraft>(HOTEL_SESSION_KEYS.draft);
}

export function setHotelBookingDraft(draft: HotelBookingDraft): void {
  hotelSessionSet(HOTEL_SESSION_KEYS.draft, draft);
}
