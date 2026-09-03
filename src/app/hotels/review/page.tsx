"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HotelBookingProgress } from "@/components/hotels/HotelBookingProgress";
import { formatHotelPriceInr } from "@/lib/tripjack-hotels/format";
import {
  hotelSessionGet,
  hotelSessionSet,
  HOTEL_SESSION_KEYS,
} from "@/lib/tripjack-hotels/session";
import type {
  HotelGuestDetails,
  HotelRoomOption,
  HotelSearchRequest,
  RoomGuestRoom,
} from "@/lib/tripjack-hotels/types";

type Selection = {
  hid: string;
  hotelName: string;
  locality?: string;
  option: HotelRoomOption;
  search: HotelSearchRequest | null;
};

type GuestBundle = {
  guestDetails: HotelGuestDetails;
  roomGuestRooms: RoomGuestRoom[];
};

export default function HotelReviewPage() {
  const router = useRouter();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [guests, setGuests] = useState<GuestBundle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState<string | null>(null);

  useEffect(() => {
    const sel = hotelSessionGet<Selection>(HOTEL_SESSION_KEYS.selectedOption);
    const g = hotelSessionGet<GuestBundle>(HOTEL_SESSION_KEYS.guestDetails);
    if (!sel?.option || !g?.guestDetails) {
      router.replace("/hotels/guests");
      return;
    }
    setSelection(sel);
    setGuests(g);
  }, [router]);

  async function continueToPayment() {
    if (!selection || !guests || !selection.search) return;
    setLoading(true);
    setError(null);
    setReviewNote(null);

    let reviewBookingId: string | undefined;
    let reviewNormalized: Record<string, unknown> | undefined;

    try {
      const reviewRes = await fetch("/api/hotels/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hid: selection.hid,
          optionId: selection.option.optionId,
          checkIn: selection.search.checkIn,
          checkOut: selection.search.checkOut,
          rooms: selection.search.rooms,
          adults: selection.search.adults,
          children: selection.search.children,
          destination: "Goa",
          guestDetails: guests.guestDetails,
        }),
      });
      const reviewData = await reviewRes.json();
      if (reviewData.reviewError) setReviewNote(reviewData.reviewError);
      reviewBookingId = reviewData.reviewBookingId;
      if (reviewData.review && typeof reviewData.review === "object") {
        reviewNormalized = reviewData.review as Record<string, unknown>;
        hotelSessionSet(HOTEL_SESSION_KEYS.reviewResponse, reviewData);
      }
    } catch {
      setReviewNote("Could not refresh live rate — continuing with selected price.");
    }

    try {
      const res = await fetch("/api/hotels/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tjHotelId: selection.hid,
          hotelName: selection.hotelName,
          locality: selection.locality,
          checkIn: selection.search.checkIn,
          checkOut: selection.search.checkOut,
          rooms: selection.search.rooms,
          adults: selection.search.adults,
          children: selection.search.children ?? 0,
          roomName: selection.option.roomName,
          mealBasis: selection.option.mealBasis,
          totalFare: selection.option.totalFare,
          currency: selection.option.currency,
          guestDetails: guests.guestDetails,
          roomGuestRooms: guests.roomGuestRooms,
          tripjackReviewBookingId: reviewBookingId,
          reviewNormalized,
          destination: "Goa",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create booking");
        return;
      }
      hotelSessionSet(HOTEL_SESSION_KEYS.draftBookingId, data.booking.bookingId);
      router.push("/hotels/payment");
    } catch {
      setError("Could not save booking. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!selection || !guests) return null;

  return (
    <div className="bg-white py-5 sm:py-7">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <HotelBookingProgress />
        <h1 className="font-display text-2xl font-bold text-ocean-900">Review booking</h1>
        <div className="mt-6 rounded-2xl border border-ocean-100 p-4 text-sm text-ocean-800">
          <p className="font-semibold text-ocean-900">{selection.hotelName}</p>
          <p>{selection.locality ? `${selection.locality}, Goa` : "Goa, India"}</p>
          {selection.search && (
            <p className="mt-2">
              {selection.search.checkIn} → {selection.search.checkOut} · {selection.search.rooms}{" "}
              room(s)
            </p>
          )}
          <p className="mt-2">Room: {selection.option.roomName}</p>
          {selection.option.mealBasis && <p>Meal: {selection.option.mealBasis}</p>}
          <p className="mt-4 text-lg font-bold text-ocean-900">
            Total: {formatHotelPriceInr(selection.option.totalFare, selection.option.currency)}
          </p>
          <p className="text-xs text-ocean-500">incl. taxes · payment confirms receipt; hotel confirmation follows manually</p>
          <hr className="my-4 border-ocean-100" />
          <p>{guests.guestDetails.email}</p>
          <p>{guests.guestDetails.phone}</p>
        </div>
        {reviewNote && <p className="mt-2 text-sm text-amber-700">{reviewNote}</p>}
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
        <button
          type="button"
          disabled={loading}
          onClick={() => void continueToPayment()}
          className="mt-6 rounded-full bg-ocean-gradient px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Preparing payment…" : "Proceed to payment"}
        </button>
      </div>
    </div>
  );
}
