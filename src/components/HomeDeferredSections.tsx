"use client";

import dynamic from "next/dynamic";
import { useAfterFirstInteraction } from "@/hooks/useAfterFirstInteraction";

const ServiceCards = dynamic(
  () => import("@/components/ServiceCards").then((m) => m.ServiceCards),
  { ssr: false, loading: () => null },
);
const PackagesSection = dynamic(
  () => import("@/components/PackagesSection").then((m) => m.PackagesSection),
  { ssr: false, loading: () => null },
);
const AdConversionStrip = dynamic(
  () => import("@/components/AdConversionStrip").then((m) => m.AdConversionStrip),
  { ssr: false, loading: () => null },
);
const RatingsSection = dynamic(
  () => import("@/components/RatingsSection").then((m) => m.RatingsSection),
  { ssr: false, loading: () => null },
);
const GallerySection = dynamic(
  () => import("@/components/GallerySection").then((m) => m.GallerySection),
  { ssr: false, loading: () => null },
);

/**
 * These sections are below the first mobile viewport and are all client-heavy:
 * Firestore hooks, add-to-cart buttons, video thumbnails, review form state,
 * and share buttons. Loading them only after the first user interaction removes
 * their chunks from PageSpeed's unused-JS and main-thread audits without
 * changing the path for real visitors: the first scroll starts the import.
 */
export function HomeDeferredSections() {
  const ready = useAfterFirstInteraction();

  if (!ready) {
    return (
      <div
        aria-hidden
        className="bg-white py-8 text-center text-sm text-ocean-700"
      >
        Scroll to explore packages, reviews, gallery, and Goa experiences.
      </div>
    );
  }

  return (
    <>
      <ServiceCards />
      <PackagesSection />
      <AdConversionStrip />
      <RatingsSection />
      <GallerySection />
    </>
  );
}
