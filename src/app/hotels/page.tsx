import type { Metadata } from "next";
import { HotelBookingProgress } from "@/components/hotels/HotelBookingProgress";
import { HotelSearchForm } from "@/components/hotels/HotelSearchForm";
import { HotelsCatalogBrowse } from "@/components/hotels/HotelsCatalogBrowse";
import { SITE_NAME, SITE_URL } from "@/lib/constants";
import { GOA_DISPLAY_NAME } from "@/lib/tripjack-hotels/goa";

export const metadata: Metadata = {
  title: "Hotels in Goa — Book & Pay Online",
  description: `Browse and book hotels in Goa with live prices. Pay securely with Razorpay on ${SITE_NAME}.`,
  alternates: {
    canonical: `${SITE_URL.replace(/\/$/, "")}/hotels`,
  },
};

export default function HotelsPage() {
  return (
    <div className="bg-white py-5 sm:py-7">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <HotelBookingProgress />
        <h1 className="font-display text-2xl font-bold text-ocean-900 sm:text-3xl">
          Hotels in Goa
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-ocean-700 sm:text-base">
          Search {GOA_DISPLAY_NAME} hotels, compare room rates, and pay online. Your booking is
          confirmed by our team after payment — no other destinations are offered here.
        </p>
        <div className="mt-6">
          <HotelSearchForm />
        </div>
        <div className="mt-10">
          <h2 className="font-display text-xl font-bold text-ocean-900">Featured Goa stays</h2>
          <p className="mt-1 text-sm text-ocean-600">
            Cached catalog with live price refresh when available.
          </p>
          <HotelsCatalogBrowse />
        </div>
      </div>
    </div>
  );
}
