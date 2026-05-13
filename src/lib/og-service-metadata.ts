import type { Metadata } from "next";
import type { ServiceItem } from "@/data/services";
import { SITE_NAME } from "@/lib/constants";
import { absoluteOgImageUrl } from "@/lib/og-image-url";
import { serviceDetailImages } from "@/lib/service-images";

export function buildServiceShareMetadata(
  s: ServiceItem,
  args: { title: string; description: string; canonical: string }
): Pick<Metadata, "openGraph" | "twitter"> {
  const first = serviceDetailImages(s).find((u) => u.trim().length > 0);
  const imageUrl = first ? absoluteOgImageUrl(first) : undefined;
  const images = imageUrl
    ? [{ url: imageUrl, width: 1200, height: 630, alt: s.title }]
    : undefined;

  return {
    openGraph: {
      title: args.title,
      description: args.description.slice(0, 200),
      url: args.canonical,
      type: "website",
      siteName: SITE_NAME,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: args.title,
      description: args.description.slice(0, 200),
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}
