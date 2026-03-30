import type { Metadata } from "next";
import { Suspense } from "react";
import { PaymentSuccessBanner } from "@/components/PaymentSuccessBanner";
import { HeroSection } from "@/components/HeroSection";
import { AdConversionStrip } from "@/components/AdConversionStrip";
import { ServiceCards } from "@/components/ServiceCards";
import { PackagesSection } from "@/components/PackagesSection";
import { TrustSection } from "@/components/TrustSection";
import { ComboOffers } from "@/components/ComboOffers";
import { GallerySection } from "@/components/GallerySection";
import { BlogPreview } from "@/components/BlogPreview";
import { RatingsSection } from "@/components/RatingsSection";
import { HomeScubaInfoSection } from "@/components/HomeScubaInfoSection";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `${SITE_NAME} | Scuba Diving & Goa Tour Packages`,
  description:
    "Premium scuba diving Goa, water sports, Dudhsagar, casino & nightlife bookings. Mobile-first, Razorpay secure, WhatsApp confirmations.",
};

export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    name: SITE_NAME,
    description:
      "Scuba diving and tour packages in Goa with online booking and payments.",
    areaServed: "Goa, India",
    url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Suspense fallback={null}>
        <PaymentSuccessBanner />
      </Suspense>
      <HeroSection />
      <AdConversionStrip />
      <ServiceCards />
      <PackagesSection />
      <TrustSection />
      <HomeScubaInfoSection />
      <RatingsSection />
      <ComboOffers />
      <GallerySection />
      <BlogPreview />
    </>
  );
}
