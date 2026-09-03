"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { GOA_DISPLAY_NAME } from "@/lib/tripjack-hotels/goa";
import { hotelSessionSet, HOTEL_SESSION_KEYS } from "@/lib/tripjack-hotels/session";
import type { HotelSearchRequest } from "@/lib/tripjack-hotels/types";

function defaultCheckIn(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

function defaultCheckOut(): string {
  const d = new Date();
  d.setDate(d.getDate() + 8);
  return d.toISOString().slice(0, 10);
}

export function HotelSearchForm({ compact }: { compact?: boolean }) {
  const router = useRouter();
  const [checkIn, setCheckIn] = useState(defaultCheckIn());
  const [checkOut, setCheckOut] = useState(defaultCheckOut());
  const [rooms, setRooms] = useState(1);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (checkOut <= checkIn) {
      setError("Check-out must be after check-in.");
      return;
    }
    const search: HotelSearchRequest = {
      checkIn,
      checkOut,
      rooms,
      adults,
      children,
    };
    hotelSessionSet(HOTEL_SESSION_KEYS.searchRequest, search);
    hotelSessionSet(HOTEL_SESSION_KEYS.searchContext, {
      destination: GOA_DISPLAY_NAME,
      city: "goa",
    });
    router.push("/hotels/results");
  }

  return (
    <form
      onSubmit={submit}
      className={`rounded-2xl border border-ocean-100 bg-white p-4 shadow-sm ${compact ? "" : "sm:p-6"}`}
    >
      <div className="mb-3">
        <label className="text-xs font-semibold uppercase tracking-wide text-ocean-500">
          Destination
        </label>
        <p className="mt-1 font-medium text-ocean-900">{GOA_DISPLAY_NAME}</p>
        <p className="text-xs text-ocean-500">Goa hotels only — other cities are not available.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="block text-sm">
          <span className="font-medium text-ocean-800">Check-in</span>
          <input
            type="date"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
            required
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-ocean-800">Check-out</span>
          <input
            type="date"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
            required
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-ocean-800">Rooms</span>
          <input
            type="number"
            min={1}
            max={6}
            value={rooms}
            onChange={(e) => setRooms(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-ocean-800">Adults</span>
          <input
            type="number"
            min={1}
            max={12}
            value={adults}
            onChange={(e) => setAdults(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-ocean-800">Children</span>
          <input
            type="number"
            min={0}
            max={6}
            value={children}
            onChange={(e) => setChildren(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
          />
        </label>
      </div>
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
      <button
        type="submit"
        className="mt-4 w-full rounded-full bg-ocean-gradient px-6 py-3 text-sm font-semibold text-white sm:w-auto"
      >
        Search Goa hotels
      </button>
    </form>
  );
}
