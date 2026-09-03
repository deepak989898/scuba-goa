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
  /** Clickable gallery — photos from related services only. */
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
 * Hero gallery uses related service photos only (main + thumbnails).
 * Article/guide hero images are fallback when no related services have images.
 */
export function buildBlogHeroGalleryData(input: {
  title: string;
  featuredPrimary: string;
  featuredFallback: string;
  relatedServices: ServiceItem[];
  focusService?: ServiceItem | null;
}): BlogHeroGalleryData {
  const title = input.title.trim() || "Article";
  const featuredMain =
    pickBlogFeaturedImage(input.featuredPrimary) ||
    pickBlogFeaturedImage(input.featuredFallback) ||
    input.featuredFallback.trim();
  const featuredFallback = input.featuredFallback.trim();

  const serviceThumbs: BlogHeroGallerySlide[] = [];
  const seen = new Set<string>();

  const ordered: ServiceItem[] = [];
  if (input.focusService && input.focusService.active !== false) {
    ordered.push(input.focusService);
  }
  for (const svc of input.relatedServices) {
    if (svc.active === false) continue;
    if (ordered.some((s) => s.slug === svc.slug)) continue;
    ordered.push(svc);
  }

  for (const service of ordered) {
    const href = `/services/${service.slug}`;
    const label = `${service.title} in Goa`;
    for (const img of serviceDetailImages(service)) {
      pushThumb(serviceThumbs, seen, img, label, href);
    }
    if (serviceThumbs.length >= 12) break;
  }

  const mainUrl = serviceThumbs[0]?.url || featuredMain;
  const mainAlt = serviceThumbs[0]?.alt || title;
  const mainFallback = serviceThumbs[0]?.url || featuredFallback || featuredMain;

  return {
    mainUrl,
    mainFallback,
    mainAlt,
    serviceThumbs,
  };
}

/** Pick the primary related service for gallery ordering (within related set). */
export function resolveBlogFocusService(
  services: ServiceItem[],
  related: ServiceItem[],
  focusSlug?: string,
  content?: { title: string; keywords: string[] },
): ServiceItem | null {
  const slug = focusSlug?.trim();
  if (slug) {
    const inRelated = related.find((s) => s.slug === slug);
    if (inRelated) return inRelated;
    const exact = services.find((s) => s.slug === slug);
    if (exact && exact.active !== false) return exact;
  }

  const candidates = related.filter((s) => s.active !== false);
  if (candidates.length === 0) return null;

  const text = `${content?.title ?? ""} ${(content?.keywords ?? []).join(" ")}`
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ");

  if (/russian|night.?club|nightclub|disco|pub\b/.test(text)) {
    const nightlife = candidates.find(
      (s) =>
        s.slug === "night-club" ||
        s.slug.includes("night-club") ||
        s.slug.includes("nightclub"),
    );
    if (nightlife) return nightlife;
  }

  let best: { service: ServiceItem; score: number } | null = null;
  for (const service of candidates) {
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

  return candidates[0] ?? null;
}
