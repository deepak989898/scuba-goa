"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { formatHotelPriceInr } from "@/lib/tripjack-hotels/format";
import type { HotelBookingDoc } from "@/lib/tripjack-hotels/types";

export default function HotelBookingSuccessClient() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId") ?? "";
  const [booking, setBooking] = useState<HotelBookingDoc | null>(null);

  useEffect(() => {
    if (!bookingId) return;
    (async () => {
      const res = await fetch(`/api/hotels/bookings/${encodeURIComponent(bookingId)}`);
      const data = await res.json();
      if (res.ok) setBooking(data.booking);
    })();
  }, [bookingId]);

  return (
    <div className="bg-white py-5 sm:py-7">
      <div className="site-container max-w-2xl text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">
          ✓
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold text-ocean-900">
          Payment received
        </h1>
        <p className="mt-2 text-sm text-ocean-700">
          Your hotel payment is confirmed. Our team will confirm your Goa hotel booking shortly
          and share voucher details by email.
        </p>
        {booking && (
          <div className="mt-6 rounded-2xl border border-ocean-100 p-4 text-left text-sm text-ocean-800">
            <p>Booking ID: <strong>{booking.bookingId}</strong></p>
            <p className="mt-1">{booking.hotelName}</p>
            <p>{booking.checkIn} → {booking.checkOut}</p>
            <p className="mt-2 font-semibold">
              {formatHotelPriceInr(booking.totalFare, booking.currency)} paid
            </p>
            {booking.razorpayPaymentId && (
              <p className="text-xs text-ocean-500">Payment ref: {booking.razorpayPaymentId}</p>
            )}
          </div>
        )}
        {bookingId && (
          <a
            href={`/api/hotels/bookings/${encodeURIComponent(bookingId)}/invoice`}
            className="mt-4 inline-block text-sm font-semibold text-ocean-800 underline"
          >
            Download receipt
          </a>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/hotels"
            className="rounded-full border border-ocean-300 px-5 py-2 text-sm font-semibold text-ocean-800"
          >
            Book another stay
          </Link>
          <Link
            href="/"
            className="rounded-full bg-ocean-gradient px-5 py-2 text-sm font-semibold text-white"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
