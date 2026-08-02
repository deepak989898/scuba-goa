import type { Metadata } from "next";
import { SITE_URL } from "@/lib/constants";
import {
  SITE_IMAGE_PLACEHOLDER,
  sanitizePublicImageUrl,
} from "@/lib/cms-image";

/** Default share image when a page has no product photo (local brand asset, not stock). */
export const DEFAULT_OG_SHARE_IMAGE = SITE_IMAGE_PLACEHOLDER;

export function toAbsoluteMediaUrl(pathOrUrl: string | undefined | null): string {
  const raw = String(pathOrUrl ?? "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  const base = SITE_URL.replace(/\/$/, "");
  return `${base}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

export function pickShareImageUrl(
  primary: string | undefined | null,
  fallback = DEFAULT_OG_SHARE_IMAGE,
): string {
  const safe = sanitizePublicImageUrl(primary);
  return toAbsoluteMediaUrl(safe) || toAbsoluteMediaUrl(fallback) || toAbsoluteMediaUrl(SITE_IMAGE_PLACEHOLDER);
}

export function formatSharePriceInr(
  price: number,
  mode: "from" | "exact" = "exact",
): string {
  const formatted = Math.round(price).toLocaleString("en-IN");
  return mode === "from" ? `Starting at ₹${formatted}` : `₹${formatted}`;
}

/** WhatsApp / Instagram clipboard caption (includes price when provided). */
export function buildShareCaption(opts: {
  title: string;
  priceInr?: number;
  mode?: "from" | "exact";
  siteName?: string;
}): string {
  const site = opts.siteName ?? "Book Scuba Goa";
  const pricePart =
    opts.priceInr != null && Number.isFinite(opts.priceInr) && opts.priceInr > 0
      ? ` · ${formatSharePriceInr(opts.priceInr, opts.mode ?? "exact")}`
      : "";
  return `${opts.title}${pricePart} | ${site}`;
}

export function buildShareTitleWithPrice(
  title: string,
  priceInr?: number,
  mode: "from" | "exact" = "from",
): string {
  if (priceInr == null || !Number.isFinite(priceInr) || priceInr <= 0) return title;
  return `${title} — ${formatSharePriceInr(priceInr, mode)}`;
}

export function buildShareDescriptionWithPrice(
  description: string,
  priceInr?: number,
  mode: "from" | "exact" = "from",
): string {
  if (description.includes("₹")) return description;
  if (priceInr == null || !Number.isFinite(priceInr) || priceInr <= 0) return description;
  return `${description} · ${formatSharePriceInr(priceInr, mode)}`;
}

export function buildShareOpenGraph(opts: {
  title: string;
  description: string;
  url: string;
  imageUrl?: string | null;
  imageAlt?: string;
  type?: "website" | "article";
  priceInr?: number;
  priceMode?: "from" | "exact";
}): NonNullable<Metadata["openGraph"]> {
  const image = pickShareImageUrl(opts.imageUrl);
  const mode = opts.priceMode ?? "from";
  const title = buildShareTitleWithPrice(opts.title, opts.priceInr, mode);
  const description = buildShareDescriptionWithPrice(
    opts.description,
    opts.priceInr,
    mode,
  );
  return {
    title,
    description,
    url: opts.url,
    siteName: "Book Scuba Goa",
    locale: "en_IN",
    type: opts.type ?? "website",
    images: [
      {
        url: image,
        width: 1200,
        height: 630,
        alt: opts.imageAlt ?? opts.title,
      },
    ],
  };
}

export function buildShareTwitter(opts: {
  title: string;
  description: string;
  imageUrl?: string | null;
  priceInr?: number;
  priceMode?: "from" | "exact";
}): NonNullable<Metadata["twitter"]> {
  const image = pickShareImageUrl(opts.imageUrl);
  const mode = opts.priceMode ?? "from";
  return {
    card: "summary_large_image",
    title: buildShareTitleWithPrice(opts.title, opts.priceInr, mode),
    description: buildShareDescriptionWithPrice(
      opts.description,
      opts.priceInr,
      mode,
    ),
    images: [image],
  };
}
