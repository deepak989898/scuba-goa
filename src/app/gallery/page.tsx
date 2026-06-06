import type { Metadata } from "next";
import { GalleryPageContent } from "@/components/GalleryPageContent";
import { SITE_NAME, SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Gallery",
  description: `${SITE_NAME} — photos and reels from scuba trips in Goa.`,
  alternates: {
    canonical: `${SITE_URL.replace(/\/$/, "")}/gallery`,
  },
  openGraph: {
    title: `Gallery | ${SITE_NAME}`,
    description:
      "Underwater shots, boats, and short reels from dives and experiences.",
    url: `${SITE_URL.replace(/\/$/, "")}/gallery`,
  },
};

export default function GalleryPage() {
  return <GalleryPageContent />;
}
