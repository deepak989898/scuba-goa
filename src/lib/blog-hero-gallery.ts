import type { ServiceItem } from "@/data/services";
import {
  pickBlogFeaturedImage,
  sanitizePublicImageUrl,
  SITE_IMAGE_PLACEHOLDER,
} from "@/lib/cms-image";

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

/** True when URL points to video/reel media (not a raster image). */
export function isVideoMediaUrl(url: string | undefined | null): boolean {
  const t = String(url ?? "").trim().toLowerCase();
  if (!t) return false;
  if (/\.(mp4|webm|mov|m4v|ogv|ogg)(\?|#|$)/i.test(t)) return true;
  if (t.includes("video%2f") || t.includes("/video/")) return true;
  if (t.includes("reel%2f") || t.includes("/reels/")) return true;
  return false;
}

function normalizeMediaKey(url: string): string {
  return url.trim();
}

/** Gallery image URLs only — no placeholder, no videos. */
function collectServiceImageUrls(service: ServiceItem): string[] {
  const main = sanitizePublicImageUrl(service.image);
  const extras =
    service.galleryUrls
      ?.map((u) => sanitizePublicImageUrl(u))
      .filter((u) => u.length > 0 && !isVideoMediaUrl(u)) ?? [];
  const out: string[] = [];
  if (main && main !== SITE_IMAGE_PLACEHOLDER && !isVideoMediaUrl(main)) {
    out.push(main);
  }
  for (const u of extras) {
    if (u !== SITE_IMAGE_PLACEHOLDER && !out.includes(u)) out.push(u);
  }
  return out;
}

function pushThumb(
  thumbs: BlogHeroGallerySlide[],
  seen: Set<string>,
  url: string,
  alt: string,
  href?: string,
  kind: BlogHeroGallerySlideKind = "image",
): void {
  const key = normalizeMediaKey(url);
  if (!key || seen.has(key)) return;

  if (kind === "image") {
    if (isVideoMediaUrl(key)) return;
    const clean =
      sanitizePublicImageUrl(key) || pickBlogFeaturedImage(key);
    if (
      !clean ||
      clean === SITE_IMAGE_PLACEHOLDER ||
      clean.includes("booking-header") ||
      isVideoMediaUrl(clean)
    ) {
      return;
    }
    seen.add(key);
    thumbs.push({ url: clean, alt, href, kind });
    return;
  }

  if (!isVideoMediaUrl(key)) return;
  seen.add(key);
  thumbs.push({ url: key, alt, href, kind });
}

/** Photos + posts + reels + videos for the focus service hero thumbnail row. */
function appendServiceGalleryThumbs(
  thumbs: BlogHeroGallerySlide[],
  seen: Set<string>,
  service: ServiceItem,
): void {
  const href = `/services/${service.slug}`;
  const label = `${service.title} in Goa`;
  const media = service.serviceMedia;

  const reelUrls = new Set(
    (media?.reels ?? []).map((u) => normalizeMediaKey(u)).filter(Boolean),
  );
  const videoUrls = new Set(
    (media?.videos ?? []).map((u) => normalizeMediaKey(u)).filter(Boolean),
  );

  for (const img of collectServiceImageUrls(service)) {
    const key = normalizeMediaKey(img);
    if (reelUrls.has(key)) continue;
    if (videoUrls.has(key)) continue;
    if (isVideoMediaUrl(key)) continue;
    pushThumb(thumbs, seen, img, label, href, "image");
  }

  for (const url of media?.posts ?? []) {
    const key = normalizeMediaKey(url);
    if (!key || reelUrls.has(key) || videoUrls.has(key)) continue;
    if (isVideoMediaUrl(key)) continue;
    pushThumb(thumbs, seen, url, `${label} — photo`, href, "image");
  }

  for (const url of reelUrls) {
    pushThumb(thumbs, seen, url, `${label} — reel`, href, "reel");
  }

  for (const url of videoUrls) {
    if (reelUrls.has(url)) continue;
    pushThumb(thumbs, seen, url, `${label} — video`, href, "video");
  }

  // Video files stored only in galleryUrls (not in reels/videos tabs).
  for (const raw of service.galleryUrls ?? []) {
    const key = normalizeMediaKey(raw);
    if (!key || seen.has(key) || reelUrls.has(key) || videoUrls.has(key)) {
      continue;
    }
    if (!isVideoMediaUrl(key)) continue;
    pushThumb(thumbs, seen, key, `${label} — video`, href, "video");
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
