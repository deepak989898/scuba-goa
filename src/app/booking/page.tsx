import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingForm } from "@/components/BookingForm";
import { BookingTrustRow } from "@/components/BookingTrustRow";
import { BookingHero } from "@/components/booking/BookingHero";
import { BookingAdvanceBanner } from "@/components/booking/BookingAdvanceBanner";
import { BookingBottomBar } from "@/components/booking/BookingBottomBar";
import { PRIMARY_SEO_KEYWORDS, SITE_NAME, SITE_URL } from "@/lib/constants";
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
      <div className="bg-gradient-to-b from-sky-100 via-ocean-50 to-white pb-6 pt-2 sm:pb-8 sm:pt-3">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <BookingHero />
          <BookingTrustRow />
          <div className="mt-3">
            <BookingAdvanceBanner />
          </div>
          <div className="mt-3">
            <Suspense
              fallback={
                <p className="text-center text-ocean-700">Loading booking…</p>
              }
            >
              <BookingForm />
            </Suspense>
          </div>
          <div className="mt-4">
            <BookingBottomBar />
          </div>
        </div>
      </div>
    </>
  );
}
