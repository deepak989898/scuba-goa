import type { ServiceItem } from "@/data/services";
import { pickBlogFeaturedImage } from "@/lib/cms-image";
import { serviceDetailImages } from "@/lib/service-images";

export type BlogHeroGallerySlide = {
  url: string;
  alt: string;
  href?: string;
};

export type BlogHeroGalleryData = {
  mainUrl: string;
  mainFallback: string;
  mainAlt: string;
  /** Thumbnails — only the linked service’s gallery (1, 2, 4… photos). */
  serviceThumbs: BlogHeroGallerySlide[];
};

function pushThumb(
  thumbs: BlogHeroGallerySlide[],
  seen: Set<string>,
  url: string,
  alt: string,
  href?: string,
): void {
  const clean =
    pickBlogFeaturedImage(url) ||
    (url.trim().startsWith("http") ? url.trim() : "");
  if (!clean || seen.has(clean)) return;
  seen.add(clean);
  thumbs.push({ url: clean, alt, href });
}

/**
 * Main hero = blog featured image. Thumbnail row = all photos for the linked service only.
 */
export function buildBlogHeroGalleryData(input: {
  title: string;
  featuredPrimary: string;
  featuredFallback: string;
  focusService?: ServiceItem | null;
  /** Extra services (e.g. guide related activities) — thumbnails after focus service. */
  extraServices?: ServiceItem[];
}): BlogHeroGalleryData {
  const title = input.title.trim() || "Blog article";
  const mainUrl =
    pickBlogFeaturedImage(input.featuredPrimary) ||
    pickBlogFeaturedImage(input.featuredFallback) ||
    input.featuredFallback.trim();
  const mainFallback = input.featuredFallback.trim();

  const serviceThumbs: BlogHeroGallerySlide[] = [];
  const seen = new Set<string>();

  const addServiceImages = (service: ServiceItem) => {
    const href = `/services/${service.slug}`;
    const label = `${service.title} in Goa`;
    for (const img of serviceDetailImages(service)) {
      pushThumb(serviceThumbs, seen, img, label, href);
    }
  };

  if (input.focusService) {
    addServiceImages(input.focusService);
  }

  for (const svc of input.extraServices ?? []) {
    if (input.focusService?.slug === svc.slug) continue;
    if (svc.active === false) continue;
    addServiceImages(svc);
    if (serviceThumbs.length >= 12) break;
  }

  return {
    mainUrl,
    mainFallback,
    mainAlt: title,
    serviceThumbs,
  };
}

/** Pick the service whose gallery thumbnails should appear on a blog post. */
export function resolveBlogFocusService(
  services: ServiceItem[],
  related: ServiceItem[],
  focusSlug?: string,
  content?: { title: string; keywords: string[] },
): ServiceItem | null {
  const slug = focusSlug?.trim();
  if (slug) {
    const exact = services.find((s) => s.slug === slug);
    if (exact) return exact;
  }

  const text = `${content?.title ?? ""} ${(content?.keywords ?? []).join(" ")}`
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ");

  if (/russian|night.?club|nightclub|disco|pub\b/.test(text)) {
    const nightlife = services.find(
      (s) =>
        s.slug === "night-club" ||
        s.slug.includes("night-club") ||
        s.slug.includes("nightclub"),
    );
    if (nightlife) return nightlife;
  }

  let best: { service: ServiceItem; score: number } | null = null;
  for (const service of services) {
    if (service.active === false) continue;
    const hay = `${service.slug} ${service.title} ${service.short}`
      .toLowerCase()
      .replace(/-/g, " ");
    let score = 0;
    for (const word of text.split(/\s+/)) {
      if (word.length >= 3 && hay.includes(word)) score += 1;
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { service, score };
    }
  }
  if (best) return best.service;

  return related[0] ?? null;
}
