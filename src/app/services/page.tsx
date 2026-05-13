import type { Metadata } from "next";
import { ServicesGrid } from "@/components/ServicesGrid";
import { fallbackServices } from "@/data/services";
import { SITE_NAME, SITE_URL } from "@/lib/constants";
import { absoluteOgImageUrl } from "@/lib/og-image-url";

const servicesShareImage = fallbackServices[0]?.image
  ? absoluteOgImageUrl(fallbackServices[0].image)
  : undefined;
const baseUrl = SITE_URL.replace(/\/$/, "");

export const metadata: Metadata = {
  title: "All Services",
  description:
    "Scuba diving Goa, North & South tours, Dudhsagar, water sports, dolphin trips, casinos, clubs, pubs, disco, flyboarding, bungee.",
  alternates: { canonical: `${baseUrl}/services` },
  openGraph: {
    title: `All services | ${SITE_NAME}`,
    description:
      "Scuba diving Goa, tours, Dudhsagar, water sports & more — browse and book online.",
    url: `${baseUrl}/services`,
    type: "website",
    siteName: SITE_NAME,
    images: servicesShareImage
      ? [{ url: servicesShareImage, width: 1200, height: 630, alt: `${SITE_NAME} services` }]
      : undefined,
  },
  twitter: {
    card: "summary_large_image",
    title: `All services | ${SITE_NAME}`,
    images: servicesShareImage ? [servicesShareImage] : undefined,
  },
};

export default function ServicesPage() {
  return (
    <div className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-display text-4xl font-bold text-ocean-900">
          All services
        </h1>
        <p className="mt-3 max-w-2xl text-ocean-700">
          Add services to your cart and pay once with Razorpay, or open any page for
          full details.
        </p>
        <ServicesGrid />
      </div>
    </div>
  );
}
