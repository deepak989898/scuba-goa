"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatHotelDateLabel, formatHotelPriceInr } from "@/lib/goa-hotels/format";
import { hotelSessionClear } from "@/lib/goa-hotels/session";

type BookingSummary = {
  bookingId: string;
  hotelName: string;
  hotelSlug: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guestName: string;
  totalAmountInr: number;
  status: string;
};

export default function HotelBookingSuccessClient() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId") ?? "";
  const [booking, setBooking] = useState<BookingSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    hotelSessionClear();
    if (!bookingId) {
      setError("Missing booking reference.");
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `/api/hotels/bookings/${encodeURIComponent(bookingId)}`,
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not load booking");
        setBooking(data.booking as BookingSummary);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load booking");
      }
    })();
  }, [bookingId]);

  return (
    <div className="bg-white py-12 sm:py-16">
      <div className="site-container max-w-xl text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-2xl">
          ✓
        </div>
        <h1 className="mt-6 font-display text-3xl font-bold text-ocean-900">
          Hotel booking confirmed
        </h1>
        <p className="mt-3 text-sm text-ocean-700">
          Payment received. We&apos;ve emailed your confirmation and our team will coordinate
          with the hotel.
        </p>

        {error ? (
          <p className="mt-6 text-sm text-red-600">{error}</p>
        ) : booking ? (
          <div className="mt-8 rounded-2xl border border-ocean-100 bg-ocean-50/50 p-6 text-left text-sm text-ocean-800">
            <p><strong>Hotel:</strong> {booking.hotelName}</p>
            <p><strong>Room:</strong> {booking.roomName}</p>
            <p>
              <strong>Stay:</strong> {formatHotelDateLabel(booking.checkIn)} →{" "}
              {formatHotelDateLabel(booking.checkOut)} ({booking.nights} night(s))
            </p>
            <p><strong>Guest:</strong> {booking.guestName}</p>
            <p><strong>Paid:</strong> {formatHotelPriceInr(booking.totalAmountInr)}</p>
            <p className="mt-2 text-xs text-ocean-500">Ref: {booking.bookingId}</p>
          </div>
        ) : (
          <p className="mt-6 text-sm text-ocean-600">Loading booking…</p>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/hotels"
            className="inline-flex min-h-11 items-center rounded-full bg-ocean-gradient px-6 py-2 text-sm font-bold text-white"
          >
            Browse more hotels
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-full border border-ocean-200 px-6 py-2 text-sm font-semibold text-ocean-800"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
