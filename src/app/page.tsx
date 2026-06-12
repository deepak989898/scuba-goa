import type { Metadata } from "next";
import { Suspense } from "react";
import { HomeDeferredSections } from "@/components/HomeDeferredSections";
import { HeroSection } from "@/components/HeroSection";
import { PaymentSuccessBannerSlot } from "@/components/PaymentSuccessBannerSlot";
import { HomeBookingCTASection } from "@/components/HomeBookingCTASection";
import { BlogPreview } from "@/components/BlogPreview";
import { HomeScubaInfoSection } from "@/components/HomeScubaInfoSection";
import { TrustSection } from "@/components/TrustSection";
import { BOOK_SCUBA_FAQ, faqPageJsonLd } from "@/lib/seo-health/faq-data";
import { PRIMARY_SEO_KEYWORDS, SITE_NAME, SITE_URL } from "@/lib/constants";
import { getAllServicesServer } from "@/lib/get-services-server";
import { serviceDetailImages } from "@/lib/service-images";
import {
  buildShareOpenGraph,
  buildShareTwitter,
  DEFAULT_OG_SHARE_IMAGE,
} from "@/lib/og-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const services = await getAllServicesServer();
  const featured =
    services.find((s) => s.slug === "scuba-diving") ??
    services.find((s) => s.mostBooked) ??
    services[0];
  const heroImage = featured
    ? serviceDetailImages(featured).find(Boolean) ?? featured.image
    : DEFAULT_OG_SHARE_IMAGE;
  const canonical = `${SITE_URL.replace(/\/$/, "")}/`;
  const title = `${SITE_NAME} | Scuba Diving in Goa — Price, Packages & Booking`;
  const description =
    "Scuba diving in Goa: live scuba diving price Goa, guides to pick the best scuba in Goa, plus Dudhsagar, tours & water sports. Book online with Razorpay; WhatsApp slot confirmation.";

  return {
    title,
    description,
    keywords: [...PRIMARY_SEO_KEYWORDS],
    alternates: { canonical },
    openGraph: buildShareOpenGraph({
      title: `${SITE_NAME} | Scuba Diving in Goa`,
      description:
        "Book scuba diving in Goa with transparent pricing. Compare packages, read 2026 price & safety guides, checkout securely.",
      url: canonical,
      imageUrl: heroImage,
      imageAlt: featured?.title ?? "Scuba diving in Goa",
    }),
    twitter: buildShareTwitter({
      title: `${SITE_NAME} | Scuba Diving in Goa`,
      description:
        "Scuba diving price Goa, best scuba in Goa packages, secure booking & WhatsApp support.",
      imageUrl: heroImage,
    }),
  };
}

export default function HomePage() {
  const site = SITE_URL.replace(/\/$/, "");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    name: SITE_NAME,
    description:
      "Book scuba diving in Goa online with live prices, Grand Island trips, Razorpay checkout, and WhatsApp support from Baga.",
    knowsAbout: [...PRIMARY_SEO_KEYWORDS, "book scuba goa", "Grand Island scuba diving"],
    areaServed: { "@type": "Place", name: "Goa, India" },
    url: site,
    sameAs: [site],
  };
  const faqLd = faqPageJsonLd(BOOK_SCUBA_FAQ);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <Suspense fallback={null}>
        <PaymentSuccessBannerSlot />
      </Suspense>
      <HeroSection />
      <HomeDeferredSections />
      <TrustSection />
      <HomeBookingCTASection />
      <BlogPreview />
      <HomeScubaInfoSection />
    </>
  );
}
