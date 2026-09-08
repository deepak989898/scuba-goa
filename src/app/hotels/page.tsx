import type { Metadata } from "next";
import { HotelCard } from "@/components/hotels/HotelCard";
import { listGoaHotels } from "@/lib/goa-hotels/firestore";
import { SITE_NAME, SITE_URL } from "@/lib/constants";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Goa hotels",
  description: `Book Goa hotels online with ${SITE_NAME}. Browse curated stays with photos, facilities, and Razorpay checkout.`,
  alternates: {
    canonical: `${SITE_URL.replace(/\/$/, "")}/hotels`,
  },
};

export default async function HotelsPage() {
  const hotels = await listGoaHotels(48);

  return (
    <div className="bg-white py-10 sm:py-14">
      <div className="site-container">
        <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">
          Goa stays
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-ocean-900 sm:text-4xl">
          Hotels in Goa
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-ocean-700">
          Curated Goa hotels with live rates from our partner catalog. Pick dates on the hotel
          page, pay securely with Razorpay, and we&apos;ll coordinate your stay.
        </p>

        {hotels.length === 0 ? (
          <p className="mt-10 rounded-2xl border border-dashed border-ocean-200 bg-ocean-50/50 p-8 text-sm text-ocean-700">
            No hotels loaded yet. If you just added{" "}
            <code className="text-xs">SAFAR_SATHI_FIREBASE_SERVICE_ACCOUNT_KEY</code> on Vercel,
            redeploy and wait a few minutes. Safar Sathi must have documents in{" "}
            <code className="text-xs">goaHotels</code> with{" "}
            <code className="text-xs">sharedFor: bookscubagoa</code>. Check{" "}
            <code className="text-xs">/api/hotels/catalog-health</code> after deploy.
          </p>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {hotels.map((hotel) => (
              <HotelCard key={hotel.id} hotel={hotel} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
