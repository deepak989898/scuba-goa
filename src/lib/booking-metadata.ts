import type { Metadata } from "next";
import { fallbackPackages } from "@/data/fallback-packages";
import { parseBookingOption } from "@/lib/booking-selection";
import { PRIMARY_SEO_KEYWORDS, SITE_NAME, SITE_URL } from "@/lib/constants";
import { getPackageByIdServer } from "@/lib/get-packages-server";
import { getServiceBySlugServer } from "@/lib/get-services-server";
import { absoluteOgImageUrl } from "@/lib/og-image-url";
import { ADVANCE_BOOKING_INR } from "@/lib/payment";
import { serviceDetailImages } from "@/lib/service-images";

const DEFAULT_BOOKING_DESC =
  "Book scuba diving in Goa online: live scuba diving price Goa, cart checkout with Razorpay (UPI, cards, netbanking). Best scuba in Goa packages—no login required.";

function singleParam(
  v: string | string[] | undefined
): string | undefined {
  if (v === undefined) return undefined;
  const s = Array.isArray(v) ? v[0] : v;
  const t = typeof s === "string" ? s.trim() : "";
  return t.length ? t : undefined;
}

export async function buildBookingMetadata(
  searchParams: Record<string, string | string[] | undefined>
): Promise<Metadata> {
  const baseUrl = SITE_URL.replace(/\/$/, "");
  const canonical = `${baseUrl}/booking`;

  const packageId = singleParam(searchParams.package);
  const opt = singleParam(searchParams.opt);

  let title = `Book Scuba Diving in Goa — Pay Online | ${SITE_NAME}`;
  let description = DEFAULT_BOOKING_DESC;
  let imageUrl: string | undefined;

  if (packageId) {
    const p = await getPackageByIdServer(packageId);
    if (p) {
      title = `Book ${p.name} | ${SITE_NAME}`;
      description = `${p.name} — ₹${p.price.toLocaleString("en-IN")} · ${p.duration}. Pay ₹${ADVANCE_BOOKING_INR.toLocaleString("en-IN")} advance online with Razorpay.`;
      imageUrl = p.imageUrl ? absoluteOgImageUrl(p.imageUrl) : undefined;
    }
  } else if (opt) {
    const parsed = parseBookingOption(opt);
    if (parsed?.kind === "package") {
      const p = await getPackageByIdServer(parsed.id);
      if (p) {
        title = `Book ${p.name} | ${SITE_NAME}`;
        description = `${p.name} — ₹${p.price.toLocaleString("en-IN")} · ${p.duration}. Secure Razorpay checkout.`;
        imageUrl = p.imageUrl ? absoluteOgImageUrl(p.imageUrl) : undefined;
      }
    } else if (parsed?.kind === "service") {
      const s = await getServiceBySlugServer(parsed.slug);
      if (s) {
        title = `Book ${s.title} | ${SITE_NAME}`;
        description = `${s.short} — from ₹${s.priceFrom.toLocaleString("en-IN")}. Pay ₹${ADVANCE_BOOKING_INR.toLocaleString("en-IN")} advance with Razorpay.`;
        const first = serviceDetailImages(s).find((u) => u.trim().length > 0);
        imageUrl = first ? absoluteOgImageUrl(first) : undefined;
      }
    } else if (parsed?.kind === "serviceSub") {
      const s = await getServiceBySlugServer(parsed.slug);
      if (s) {
        title = `Book ${s.title} | ${SITE_NAME}`;
        description = `${s.short} — from ₹${s.priceFrom.toLocaleString("en-IN")}. Secure checkout.`;
        const first = serviceDetailImages(s).find((u) => u.trim().length > 0);
        imageUrl = first ? absoluteOgImageUrl(first) : undefined;
      }
    }
  }

  if (!imageUrl && fallbackPackages[0]?.imageUrl) {
    imageUrl = absoluteOgImageUrl(fallbackPackages[0].imageUrl);
  }

  const images = imageUrl
    ? [{ url: imageUrl, width: 1200, height: 630, alt: title }]
    : undefined;

  return {
    title,
    description: description.slice(0, 320),
    keywords: [...PRIMARY_SEO_KEYWORDS, "book scuba Goa", "Razorpay scuba"],
    alternates: { canonical },
    openGraph: {
      title,
      description: description.slice(0, 200),
      url: canonical,
      type: "website",
      siteName: SITE_NAME,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: description.slice(0, 200),
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}
