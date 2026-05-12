import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { PaymentSuccessBanner } from "@/components/PaymentSuccessBanner";
import { HeroSection } from "@/components/HeroSection";
import { PRIMARY_SEO_KEYWORDS, SITE_NAME, SITE_URL } from "@/lib/constants";

/**
 * Everything below the hero is split into its own chunk so the homepage JS
 * payload PageSpeed measures on first paint stays small. With ~150 KB of
 * "unused JavaScript" reported on mobile, splitting the below-the-fold
 * sections lets the browser parse them only when they are about to render.
 */
const AdConversionStrip = dynamic(() =>
  import("@/components/AdConversionStrip").then((m) => m.AdConversionStrip),
);
const ServiceCards = dynamic(() =>
  import("@/components/ServiceCards").then((m) => m.ServiceCards),
);
const PackagesSection = dynamic(() =>
  import("@/components/PackagesSection").then((m) => m.PackagesSection),
);
const GallerySection = dynamic(() =>
  import("@/components/GallerySection").then((m) => m.GallerySection),
);
const RatingsSection = dynamic(() =>
  import("@/components/RatingsSection").then((m) => m.RatingsSection),
);
const TrustSection = dynamic(() =>
  import("@/components/TrustSection").then((m) => m.TrustSection),
);
const HomeBookingCTASection = dynamic(() =>
  import("@/components/HomeBookingCTASection").then((m) => m.HomeBookingCTASection),
);
const BlogPreview = dynamic(() =>
  import("@/components/BlogPreview").then((m) => m.BlogPreview),
);
const HomeScubaInfoSection = dynamic(() =>
  import("@/components/HomeScubaInfoSection").then((m) => m.HomeScubaInfoSection),
);

export const metadata: Metadata = {
  title: `${SITE_NAME} | Scuba Diving in Goa — Price, Packages & Booking`,
  description:
    "Scuba diving in Goa: live scuba diving price Goa, guides to pick the best scuba in Goa, plus Dudhsagar, tours & water sports. Book online with Razorpay; WhatsApp slot confirmation.",
  keywords: [...PRIMARY_SEO_KEYWORDS],
  alternates: {
    canonical: SITE_URL.replace(/\/$/, "") + "/",
  },
  openGraph: {
    title: `${SITE_NAME} | Scuba Diving in Goa`,
    description:
      "Book scuba diving in Goa with transparent pricing. Compare packages, read 2026 price & safety guides, checkout securely.",
    url: SITE_URL.replace(/\/$/, "") + "/",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | Scuba Diving in Goa`,
    description:
      "Scuba diving price Goa, best scuba in Goa packages, secure booking & WhatsApp support.",
  },
};

export default function HomePage() {
  const site = SITE_URL.replace(/\/$/, "");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    name: SITE_NAME,
    description:
      "Scuba diving in Goa with online booking: scuba diving price Goa, best scuba in Goa try-dives and tours. Razorpay payments and WhatsApp support.",
    knowsAbout: [...PRIMARY_SEO_KEYWORDS],
    areaServed: { "@type": "Place", name: "Goa, India" },
    url: site,
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
      <ServiceCards />
      <PackagesSection />
      <AdConversionStrip />
      <TrustSection />
      <RatingsSection />
      <HomeBookingCTASection />
      <GallerySection />
      <BlogPreview />
      <HomeScubaInfoSection />
    </>
  );
}
