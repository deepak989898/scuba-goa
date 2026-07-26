import type { Metadata } from "next";
import type { ServiceItem, SubServiceItem } from "@/data/services";
import { SITE_URL } from "@/lib/constants";
import { serviceDetailImages } from "@/lib/service-images";
import { isPricedSubService } from "@/lib/service-sub-helpers";
import {
  buildShareOpenGraph,
  buildShareTwitter,
} from "@/lib/og-metadata";

export function buildSubServiceMetadata(
  parent: ServiceItem,
  sub: SubServiceItem,
  publicSlug: string,
): Metadata {
  const baseUrl = SITE_URL.replace(/\/$/, "");
  const canonical = `${baseUrl}/services/${publicSlug}`;
  const descBase =
    sub.description?.trim() ||
    parent.short ||
    `${sub.title} — book with ${parent.title} in Goa.`;
  const desc = `${descBase.slice(0, 155)} Book ${sub.title.toLowerCase()} online with clear pricing.`;
  const shareImage = serviceDetailImages(parent).find(Boolean) ?? parent.image;
  const priceInr =
    isPricedSubService(sub) && sub.priceFrom != null
      ? sub.priceFrom
      : parent.priceFrom;
  const title = `${sub.title} | ${parent.title} in Goa`;

  return {
    title,
    description: desc.slice(0, 320),
    keywords: [
      sub.title,
      parent.title,
      "Goa",
      "booking",
      `${sub.title} price`,
      `${sub.title} package`,
    ],
    alternates: { canonical },
    openGraph: buildShareOpenGraph({
      title,
      description: desc.slice(0, 200),
      url: canonical,
      imageUrl: shareImage,
      imageAlt: sub.title,
      priceInr,
      priceMode: "from",
    }),
    twitter: buildShareTwitter({
      title,
      description: desc.slice(0, 200),
      imageUrl: shareImage,
      priceInr,
      priceMode: "from",
    }),
  };
}
