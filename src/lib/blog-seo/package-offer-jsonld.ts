import { SITE_NAME, SITE_URL } from "@/lib/constants";
import type { PackageDoc } from "@/lib/types";
import { stripUndefinedJsonLd } from "@/lib/blog-seo/json-ld";

const base = SITE_URL.replace(/\/$/, "");
const FALLBACK_IMAGE = `${base}/booking-header.png`;
const LOGO = `${base}/book-scuba-goa-logo.png`;

function toAbsoluteImage(url: string | undefined | null): string {
  const u = String(url ?? "").trim();
  if (!u) return FALLBACK_IMAGE;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  if (u.startsWith("//")) return `https:${u}`;
  return `${base}${u.startsWith("/") ? u : `/${u}`}`;
}

/**
 * Package Product / Offer JSON-LD for blog pages (Merchant listings).
 * Always includes required `image` — GSC critical error when missing.
 */
export function packageOfferCatalogJsonLd(
  packages: PackageDoc[],
  pageUrl: string,
  opts?: { fallbackImageUrl?: string },
): Record<string, unknown> | null {
  const list = packages.filter((p) => p.active !== false && p.price > 0).slice(0, 10);
  if (list.length === 0) return null;

  const fallback = toAbsoluteImage(opts?.fallbackImageUrl) || FALLBACK_IMAGE;
  const bookingUrl = `${base}/booking`;

  return stripUndefinedJsonLd({
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${SITE_NAME} packages`,
    url: pageUrl,
    numberOfItems: list.length,
    itemListElement: list.map((pkg, i) => {
      const image = toAbsoluteImage(pkg.imageUrl) || fallback;
      return {
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "Product",
          name: pkg.name,
          description:
            pkg.duration?.trim() ||
            `${pkg.name} experience with ${SITE_NAME}`,
          image: [image],
          brand: {
            "@type": "Brand",
            name: SITE_NAME,
            logo: LOGO,
          },
          offers: {
            "@type": "Offer",
            price: pkg.price,
            priceCurrency: "INR",
            availability: "https://schema.org/InStock",
            url: bookingUrl,
          },
        },
      };
    }),
  });
}
