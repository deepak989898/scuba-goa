import type { ServiceItem } from "@/data/services";
import { pickBlogFeaturedImage } from "@/lib/cms-image";
import { serviceDetailImages } from "@/lib/service-images";

export type BlogHeroGallerySlideKind = "image" | "reel" | "video";

export type BlogHeroGallerySlide = {
  url: string;
  alt: string;
  href?: string;
  kind?: BlogHeroGallerySlideKind;
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
  kind: BlogHeroGallerySlideKind = "image",
): void {
  if (kind === "image") {
    const clean =
      pickBlogFeaturedImage(url) ||
      (url.trim().startsWith("http") ? url.trim() : "");
    if (!clean || seen.has(clean)) return;
    seen.add(clean);
    thumbs.push({ url: clean, alt, href, kind });
    return;
  }

  const clean = url.trim();
  if (!clean || seen.has(clean)) return;
  seen.add(clean);
  thumbs.push({ url: clean, alt, href, kind });
}

/** Photos + posts + reels + videos for the focus service hero thumbnail row. */
function appendServiceGalleryThumbs(
  thumbs: BlogHeroGallerySlide[],
  seen: Set<string>,
  service: ServiceItem,
): void {
  const href = `/services/${service.slug}`;
  const label = `${service.title} in Goa`;

  for (const img of serviceDetailImages(service)) {
    pushThumb(thumbs, seen, img, label, href, "image");
  }

  const media = service.serviceMedia;
  for (const url of media?.posts ?? []) {
    pushThumb(thumbs, seen, url, `${label} — photo`, href, "image");
  }
  for (const url of media?.reels ?? []) {
    pushThumb(thumbs, seen, url, `${label} — reel`, href, "reel");
  }
  for (const url of media?.videos ?? []) {
    pushThumb(thumbs, seen, url, `${label} — video`, href, "video");
  }
}

/**
 * Main hero = blog featured image. Thumbnail row = all photos for the linked service only.
 */
export function buildBlogHeroGalleryData(input: {
  title: string;
  featuredPrimary: string;
  featuredFallback: string;
  focusService?: ServiceItem | null;
}): BlogHeroGalleryData {
  const title = input.title.trim() || "Blog article";
  const mainUrl =
    pickBlogFeaturedImage(input.featuredPrimary) ||
    pickBlogFeaturedImage(input.featuredFallback) ||
    input.featuredFallback.trim();
  const mainFallback = input.featuredFallback.trim();

  const serviceThumbs: BlogHeroGallerySlide[] = [];
  const seen = new Set<string>();

  if (input.focusService) {
    appendServiceGalleryThumbs(serviceThumbs, seen, input.focusService);
  }

  return {
    mainUrl,
    mainFallback,
    mainAlt: title,
    serviceThumbs,
  };
}

/** Guide hero — main guide image + thumbnails from the linked focus service only. */
export function buildGuideHeroGalleryData(input: {
  title: string;
  heroPrimary: string;
  heroFallback: string;
  focusService?: ServiceItem | null;
}): BlogHeroGalleryData {
  const title = input.title.trim() || "Goa guide";
  const mainUrl =
    pickBlogFeaturedImage(input.heroPrimary) ||
    pickBlogFeaturedImage(input.heroFallback) ||
    input.heroFallback.trim();
  const mainFallback =
    pickBlogFeaturedImage(input.heroFallback) ||
    input.heroFallback.trim();

  const serviceThumbs: BlogHeroGallerySlide[] = [];
  const seen = new Set<string>();

  if (input.focusService) {
    appendServiceGalleryThumbs(serviceThumbs, seen, input.focusService);
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

  if (/russian|ruskii|ruski|night.?club|nightclub|nightlife|disco|pub\b/.test(text)) {
    const nightlife = services.find(
      (s) =>
        s.slug === "night-club" ||
        s.slug.includes("night-club") ||
        s.slug.includes("nightclub") ||
        /russian|night|club/i.test(s.title),
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
