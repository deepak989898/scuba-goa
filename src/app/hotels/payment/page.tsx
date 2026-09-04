"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HotelBookingProgress } from "@/components/hotels/HotelBookingProgress";
import { SITE_NAME } from "@/lib/constants";
import { loadRazorpayCheckout } from "@/lib/loadRazorpayCheckout";
import { formatHotelPriceInr } from "@/lib/tripjack-hotels/format";
import {
  hotelSessionGet,
  HOTEL_SESSION_KEYS,
} from "@/lib/tripjack-hotels/session";
import type { HotelBookingDoc } from "@/lib/tripjack-hotels/types";

export default function HotelPaymentPage() {
  const router = useRouter();
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [booking, setBooking] = useState<HotelBookingDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    const id =
      hotelSessionGet<string>(HOTEL_SESSION_KEYS.draftBookingId) ??
      hotelSessionGet<string>(HOTEL_SESSION_KEYS.confirmedBooking);
    if (!id) {
      router.replace("/hotels");
      return;
    }
    setBookingId(id);
    (async () => {
      const res = await fetch(`/api/hotels/bookings/${encodeURIComponent(id)}`);
      const data = await res.json();
      if (res.ok) setBooking(data.booking);
    })();
  }, [router]);

  async function pay() {
    if (!bookingId || !booking) return;
    setPaying(true);
    setError(null);
    try {
      const orderRes = await fetch("/api/hotels/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok) {
        setError(order.error ?? "Could not start payment");
        return;
      }

      await loadRazorpayCheckout();
      const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!key || !window.Razorpay) {
        setError("Payment checkout is not configured.");
        return;
      }

      const rzp = new window.Razorpay({
        key,
        amount: order.amount,
        currency: order.currency,
        name: SITE_NAME,
        description: `Hotel booking ${booking.hotelName}`,
        order_id: order.id,
        prefill: {
          email: booking.guestDetails.email,
          contact: booking.guestDetails.phone,
        },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          const verifyRes = await fetch("/api/hotels/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              bookingId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          const verify = await verifyRes.json();
          if (!verifyRes.ok) {
            setError(verify.error ?? "Payment verification failed");
            return;
          }
          sessionStorage.setItem(
            HOTEL_SESSION_KEYS.confirmedBooking,
            JSON.stringify({ v: bookingId, exp: Date.now() + 3600000 }),
          );
          router.push(
            `/hotels/booking-success?bookingId=${encodeURIComponent(bookingId)}`,
          );
        },
        modal: {
          ondismiss: () => setPaying(false),
        },
      });
      rzp.open();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="bg-white py-5 sm:py-7">
      <div className="site-container max-w-2xl">
        <HotelBookingProgress />
        <h1 className="font-display text-2xl font-bold text-ocean-900">Payment</h1>
        {booking ? (
          <div className="mt-4 rounded-2xl border border-ocean-100 p-4">
            <p className="font-semibold text-ocean-900">{booking.hotelName}</p>
            <p className="mt-2 text-lg font-bold text-ocean-900">
              {formatHotelPriceInr(booking.totalFare, booking.currency)}
            </p>
            <p className="text-xs text-ocean-500">Pay with UPI, cards, or netbanking via Razorpay</p>
          </div>
        ) : (
          <p className="mt-4 text-ocean-600">Loading booking…</p>
        )}
        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
        <button
          type="button"
          disabled={paying || !booking}
          onClick={() => void pay()}
          className="mt-6 rounded-full bg-ocean-gradient px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {paying ? "Opening checkout…" : "Pay now"}
        </button>
      </div>
    </div>
  );
}
