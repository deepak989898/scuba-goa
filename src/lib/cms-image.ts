/**
 * Prefer admin / CMS images; never treat Unsplash/stock as valid public media.
 */

import {
  pickCuratedBlogFallbackUrl,
} from "@/lib/blog-automation/blog-image-topic";

/** Local brand asset when a UI needs an src and no CMS image exists (booking flows). */
export const SITE_IMAGE_PLACEHOLDER = "/booking-header.png";

/** Default blog hero when no featured image — Goa beach (not booking promo banner). */
export const BLOG_FEATURED_PLACEHOLDER =
  "https://upload.wikimedia.org/wikipedia/commons/3/31/Palolem_Beach.jpg";

function isUsableBlogFeaturedCandidate(url: string): boolean {
  const t = url.trim();
  if (!t) return false;
  if (t === SITE_IMAGE_PLACEHOLDER || t.includes("booking-header")) return false;
  if (!t.startsWith("/") && !/^https?:\/\//i.test(t)) return false;
  // Reject plain text accidentally stored as URL (shows broken icon + alt).
  if (
    !t.startsWith("/") &&
    !t.includes("storage.googleapis") &&
    !t.includes("firebasestorage") &&
    !t.includes("wikimedia.org") &&
    !t.includes(".")
  ) {
    return false;
  }
  return true;
}

/** First valid blog hero URL among candidates (never booking promo banner). */
export function pickBlogFeaturedImage(
  ...candidates: Array<string | undefined | null>
): string {
  for (const c of candidates) {
    const t = String(c ?? "").trim();
    if (!isUsableBlogFeaturedCandidate(t)) continue;
    const sanitized = sanitizePublicImageUrl(t);
    if (sanitized) return sanitized;
    if (/^https:\/\/upload\.wikimedia\.org/i.test(t)) return t;
  }
  return "";
}

export function blogFeaturedFallbackUrl(slug: string, title: string): string {
  return pickCuratedBlogFallbackUrl(title, "", slug) || BLOG_FEATURED_PLACEHOLDER;
}

const ADMIN_PATH_MARKERS = [
  "/services/",
  "/hero/",
  "/blog/",
  "/seo/",
  "/uploads/",
  "/packages/",
  "/gallery/",
  "/about/",
  "services%2F",
  "hero%2F",
  "blog%2F",
  "seo%2F",
  "uploads%2F",
  "packages%2F",
  "gallery%2F",
  "about%2F",
];

export function isStockFallbackImage(url: string | undefined | null): boolean {
  const u = String(url ?? "").trim().toLowerCase();
  if (!u) return false;
  if (u.includes("images.unsplash.com")) return true;
  if (u.includes("unsplash.com/photo-")) return true;
  return false;
}

function isFirebaseOrGcsHost(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h.includes("firebasestorage") ||
    h === "storage.googleapis.com" ||
    h.endsWith(".storage.googleapis.com")
  );
}

/** True when URL looks like a real admin upload (Firebase / GCS). */
export function isAdminUploadedImage(url: string | undefined | null): boolean {
  const raw = String(url ?? "").trim();
  if (!raw || isStockFallbackImage(raw)) return false;
  try {
    const parsed = new URL(raw);
    if (!isFirebaseOrGcsHost(parsed.hostname)) return false;
    const hay = `${parsed.pathname}${parsed.search}`.toLowerCase();
    // Prefer known folders; still accept any Firebase object URL
    if (ADMIN_PATH_MARKERS.some((m) => hay.includes(m.toLowerCase()))) {
      return true;
    }
    return hay.includes("/o/") || hay.includes("%2f");
  } catch {
    return false;
  }
}

/**
 * Safe public image URL: admin Storage, or any non-stock http(s) URL admin pasted.
 * Never returns Unsplash/stock. Empty when nothing usable.
 */
export function sanitizePublicImageUrl(
  url: string | undefined | null,
): string {
  const t = String(url ?? "").trim();
  if (!t) return "";
  if (isStockFallbackImage(t)) return "";
  if (isAdminUploadedImage(t)) return t;
  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith("/") && !t.startsWith("//")) {
    // Local public assets used as intentional CMS (rare)
    if (t === SITE_IMAGE_PLACEHOLDER) return "";
    if (
      t.includes("logo") ||
      t.startsWith("/icons/") ||
      t.includes("/bill/")
    ) {
      return "";
    }
    return t;
  }
  return "";
}

/** First usable CMS image among candidates; never stock Unsplash. */
export function pickCmsImage(
  ...candidates: Array<string | undefined | null>
): string {
  for (const c of candidates) {
    const t = sanitizePublicImageUrl(c);
    if (t) return t;
  }
  return "";
}

/** CMS image or site placeholder (never stock). */
export function cmsImageOrPlaceholder(
  ...candidates: Array<string | undefined | null>
): string {
  return pickCmsImage(...candidates) || SITE_IMAGE_PLACEHOLDER;
}

/**
 * Blog hero: CMS/Firebase image → topic Wikimedia fallback → Goa beach default.
 * Never uses the booking promo banner.
 */
export function blogFeaturedImageOrPlaceholder(
  slug: string,
  title: string,
  ...candidates: Array<string | undefined | null>
): string {
  const cms = pickBlogFeaturedImage(...candidates);
  if (cms) return cms;
  return blogFeaturedFallbackUrl(slug, title);
}

/** Primary hero URL + topic fallback for client-side onError recovery. */
export function resolveBlogFeaturedImages(
  slug: string,
  title: string,
  ...candidates: Array<string | undefined | null>
): { primary: string; fallback: string } {
  const fallback = blogFeaturedFallbackUrl(slug, title);
  const primary = pickBlogFeaturedImage(...candidates);
  return { primary, fallback };
}

/** Strip stock image URLs from a service-like object for public display. */
export function sanitizeServiceImages<
  T extends {
    image?: string;
    galleryUrls?: string[];
  },
>(s: T): T {
  const image = sanitizePublicImageUrl(s.image) || undefined;
  const galleryUrls = (s.galleryUrls ?? [])
    .map((u) => sanitizePublicImageUrl(u))
    .filter(Boolean);
  return {
    ...s,
    image: image || "",
    galleryUrls: galleryUrls.length ? galleryUrls : undefined,
  };
}

export function sanitizePackageImageUrl(
  imageUrl: string | undefined | null,
): string | undefined {
  const t = sanitizePublicImageUrl(imageUrl);
  return t || undefined;
}
