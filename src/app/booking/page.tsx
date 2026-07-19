import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingForm } from "@/components/BookingForm";
import { BookingTrustRow } from "@/components/BookingTrustRow";
import { PRIMARY_SEO_KEYWORDS, SITE_NAME, SITE_URL } from "@/lib/constants";
import { ADVANCE_BOOKING_INR } from "@/lib/payment";
import { BOOK_SCUBA_FAQ, faqPageJsonLd } from "@/lib/seo-health/faq-data";

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
  const faqLd = faqPageJsonLd(BOOK_SCUBA_FAQ.slice(0, 4));
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <div className="bg-gradient-to-b from-ocean-50 to-white py-5 sm:py-7">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-center font-display text-2xl font-bold text-ocean-900 sm:text-3xl">
            Reserve Your Dive — Clear Price, Small Advance
          </h1>
          <p className="mx-auto mt-1.5 max-w-xl text-center text-sm text-ocean-700 sm:text-base">
            Choose your package · Select your date · Dive in. Contact details only when you pay.
          </p>

          <BookingTrustRow />

          <div className="mx-auto mt-4 max-w-2xl rounded-xl border border-ocean-200 bg-ocean-50 px-3 py-3 text-center sm:px-4">
            <p className="text-sm font-bold text-ocean-900 sm:text-base">
              Live prices in your cart — starting packages shown below.
            </p>
            <p className="mt-0.5 text-xs font-semibold text-ocean-800 sm:text-sm">
              Pay ₹{ADVANCE_BOOKING_INR.toLocaleString("en-IN")} per person now (advance) · pay the
              rest on the day at the centre.
            </p>
          </div>

          <div className="mt-5">
            <Suspense fallback={<p className="text-center text-ocean-700">Loading…</p>}>
              <BookingForm />
            </Suspense>
          </div>
        </div>
      </div>
    </>
  );
}
