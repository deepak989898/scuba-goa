import type { Metadata } from "next";
import { SITE_URL } from "@/lib/constants";

/** Default share image when a page has no product photo (not the site logo). */
export const DEFAULT_OG_SHARE_IMAGE =
  "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&h=630&q=80";

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
  return toAbsoluteMediaUrl(primary) || fallback;
}

export function buildShareOpenGraph(opts: {
  title: string;
  description: string;
  url: string;
  imageUrl?: string | null;
  imageAlt?: string;
  type?: "website" | "article";
}): NonNullable<Metadata["openGraph"]> {
  const image = pickShareImageUrl(opts.imageUrl);
  return {
    title: opts.title,
    description: opts.description,
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
}): NonNullable<Metadata["twitter"]> {
  const image = pickShareImageUrl(opts.imageUrl);
  return {
    card: "summary_large_image",
    title: opts.title,
    description: opts.description,
    images: [image],
  };
}
