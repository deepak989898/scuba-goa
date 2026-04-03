import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingForm } from "@/components/BookingForm";
import { PRIMARY_SEO_KEYWORDS, SITE_NAME, SITE_URL } from "@/lib/constants";
import { ADVANCE_BOOKING_INR } from "@/lib/payment";

export const metadata: Metadata = {
  title: `Book Scuba Diving in Goa — Pay Online | ${SITE_NAME}`,
  description:
    "Book scuba diving in Goa online: live scuba diving price Goa, cart checkout with Razorpay (UPI, cards, netbanking). Best scuba in Goa packages—no login required.",
  keywords: [...PRIMARY_SEO_KEYWORDS, "book scuba Goa", "Razorpay scuba"],
  alternates: {
    canonical: `${SITE_URL.replace(/\/$/, "")}/booking`,
  },
  openGraph: {
    title: `Book scuba diving in Goa | ${SITE_NAME}`,
    description:
      "Secure checkout for scuba diving in Goa and tours—compare scuba diving price Goa and pay in minutes.",
    url: `${SITE_URL.replace(/\/$/, "")}/booking`,
    type: "website",
  },
};

export default function BookingPage() {
  return (
    <div className="bg-gradient-to-b from-ocean-50 to-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-center font-display text-3xl font-bold text-ocean-900 sm:text-4xl">
          Book now — pay online — instant confirm
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-center text-ocean-700">
          Add packages or services to your cart, enter your details, then checkout with
          Razorpay (UPI, cards, netbanking). You can start with a small advance or pay
          in full — after payment you get an on-screen confirmation and we follow up on
          WhatsApp.
        </p>
        <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center">
          <p className="text-sm font-semibold text-amber-900">
            Advance booking from ₹{ADVANCE_BOOKING_INR.toLocaleString("en-IN")} per cart
            unit — lock your slot with Razorpay in seconds.
          </p>
          <p className="mt-1 text-xs text-amber-800">
            Limited-time ad offer: up to ₹500 off on selected plans (confirm during
            booking/WhatsApp).
          </p>
        </div>
        <div className="mt-10">
          <Suspense fallback={<p className="text-center text-ocean-600">Loading…</p>}>
            <BookingForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
