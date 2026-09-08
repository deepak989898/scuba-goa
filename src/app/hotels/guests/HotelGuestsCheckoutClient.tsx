"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HotelBookingProgress } from "@/components/hotels/HotelBookingProgress";
import { formatHotelDateLabel, formatHotelPriceInr } from "@/lib/goa-hotels/format";
import {
  getHotelBookingDraft,
  hotelSessionClear,
  HOTEL_SESSION_KEYS,
  hotelSessionSet,
} from "@/lib/goa-hotels/session";
import type { HotelBookingDraft } from "@/lib/goa-hotels/types";
import { loadRazorpayCheckout } from "@/lib/loadRazorpayCheckout";
import { attachRazorpayPaymentFailed } from "@/lib/razorpayCheckout";

async function resolveRazorpayKeyId(): Promise<string> {
  const buildKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  if (buildKey) return buildKey;
  const res = await fetch("/api/razorpay/public-key", { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  const keyId = typeof data?.keyId === "string" ? data.keyId.trim() : "";
  if (!res.ok || !keyId) throw new Error(data?.error ?? "Razorpay not configured");
  return keyId;
}

export function HotelGuestsCheckoutClient() {
  const router = useRouter();
  const [draft, setDraft] = useState<HotelBookingDraft | null>(null);
  const [guestName, setGuestName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const d = getHotelBookingDraft();
    if (!d) {
      router.replace("/hotels");
      return;
    }
    setDraft(d);
  }, [router]);

  async function pay() {
    if (!draft) return;
    setError(null);
    const name = guestName.trim();
    const mail = email.trim().toLowerCase();
    const ph = phone.replace(/\D/g, "");
    if (!name || !mail.includes("@") || ph.length < 10) {
      setError("Please enter valid name, email, and phone.");
      return;
    }

    setBusy(true);
    try {
      await loadRazorpayCheckout();
      const key = await resolveRazorpayKeyId();

      const orderRes = await fetch("/api/hotels/bookings/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelSlug: draft.hotelSlug,
          roomId: draft.roomId,
          checkIn: draft.checkIn,
          checkOut: draft.checkOut,
          adults: draft.adults,
          children: draft.children,
        }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error ?? "Could not start payment");

      const amountPaise = Number(orderData.amountPaise);
      const totalInr = Number(orderData.totalAmountInr);

      const options = {
        key,
        amount: amountPaise,
        currency: "INR",
        name: "Book Scuba Goa",
        description: `${draft.hotelName} — ${draft.roomName}`,
        order_id: orderData.orderId,
        prefill: { name, email: mail, contact: ph },
        theme: { color: "#0d9488" },
        handler: async (response: Record<string, string>) => {
          try {
            const verifyRes = await fetch("/api/hotels/bookings/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                booking: {
                  hotelSlug: draft.hotelSlug,
                  roomId: draft.roomId,
                  checkIn: draft.checkIn,
                  checkOut: draft.checkOut,
                  adults: draft.adults,
                  children: draft.children,
                  guestName: name,
                  email: mail,
                  phone: ph,
                  amountPaise,
                },
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error ?? "Payment verify failed");

            hotelSessionClear();
            hotelSessionSet(
              HOTEL_SESSION_KEYS.bookingId,
              verifyData.bookingId ?? response.razorpay_payment_id,
            );
            router.push(
              verifyData.successUrl ??
                `/hotels/booking-success?bookingId=${encodeURIComponent(
                  response.razorpay_payment_id,
                )}`,
            );
          } catch (e) {
            setError(e instanceof Error ? e.message : "Verification failed");
            setBusy(false);
          }
        },
      };

      const rzp = new window.Razorpay!(options);
      attachRazorpayPaymentFailed(rzp, () => {
        setBusy(false);
        setError("Payment was not completed.");
      });
      rzp.open();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed");
      setBusy(false);
    }
  }

  if (!draft) {
    return <p className="text-sm text-ocean-600">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <HotelBookingProgress />
      <h1 className="font-display text-2xl font-bold text-ocean-900">Guest details</h1>
      <p className="mt-2 text-sm text-ocean-700">
        {draft.hotelName} · {draft.roomName}
      </p>
      <p className="text-sm text-ocean-600">
        {formatHotelDateLabel(draft.checkIn)} → {formatHotelDateLabel(draft.checkOut)} ·{" "}
        {draft.nights} night(s) · {draft.adults} adult(s)
        {draft.children > 0 ? `, ${draft.children} child(ren)` : ""}
      </p>
      <p className="mt-1 font-bold text-ocean-900">
        Total {formatHotelPriceInr(draft.totalAmountInr)}
      </p>

      <div className="mt-8 space-y-4 rounded-2xl border border-ocean-100 bg-white p-6 shadow-sm">
        <label className="block text-sm">
          <span className="font-medium text-ocean-800">Full name</span>
          <input
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-ocean-200 px-3 py-2.5"
            autoComplete="name"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-ocean-800">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-ocean-200 px-3 py-2.5"
            autoComplete="email"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-ocean-800">Phone (WhatsApp)</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded-xl border border-ocean-200 px-3 py-2.5"
            autoComplete="tel"
          />
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="button"
          disabled={busy}
          onClick={() => void pay()}
          className="w-full rounded-full bg-ocean-gradient px-6 py-3 text-sm font-bold text-white shadow-lg disabled:opacity-60"
        >
          {busy ? "Opening Razorpay…" : `Pay ${formatHotelPriceInr(draft.totalAmountInr)}`}
        </button>

        <p className="text-center text-xs text-ocean-500">
          <Link href={`/hotels/${encodeURIComponent(draft.hotelSlug)}`} className="underline">
            ← Back to hotel
          </Link>
        </p>
      </div>
    </div>
  );
}
