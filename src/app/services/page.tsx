import type { Metadata } from "next";
import { ServicesGrid } from "@/components/ServicesGrid";
import { SITE_NAME, SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Scuba Diving & Tours in Goa — All Services",
  description:
    "Book scuba diving Goa, Grand Island trips, North & South Goa tours, Dudhsagar, water sports, dolphin trips, and adventure activities with live prices.",
  alternates: {
    canonical: `${SITE_URL.replace(/\/$/, "")}/services`,
  },
  openGraph: {
    title: `All Services | ${SITE_NAME}`,
    description: "Scuba diving, tours, water sports, and Goa experiences — book online.",
    url: `${SITE_URL.replace(/\/$/, "")}/services`,
  },
};

export default function ServicesPage() {
  return (
    <div className="bg-white py-5 sm:py-7">
      <div className="site-container">
        <h1 className="font-display text-2xl font-bold text-ocean-900 sm:text-3xl">
          All services
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-ocean-700 sm:text-base">
          Add services to your cart and pay once with Razorpay, or open any page for
          full details.
        </p>
        <ServicesGrid />
      </div>
    </div>
  );
}
