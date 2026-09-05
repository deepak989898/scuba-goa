import type { BlogFeaturedImageMeta } from "@/lib/cms-image";
import {
  isBlogStockImageMeta,
  isFreeStockImageUrl,
} from "@/lib/cms-image";

export type GalleryStockCheckInput = {
  type?: "image" | "video";
  mediaUrl?: string;
  posterUrl?: string;
  /** homeGallery `source` — manual, blog, etc. */
  source?: string;
  sourceSlug?: string;
  /** Copied from blog `imageMeta.source` when synced. */
  imageSource?: string;
  /** Set by server sync when image is editorial (AI / admin upload). */
  editorialImage?: boolean;
  imageMeta?: BlogFeaturedImageMeta | null;
};

const STOCK_IMAGE_SOURCES = new Set([
  "pexels",
  "pixabay",
  "unsplash",
  "wikimedia",
  "openverse",
  "curated_fallback",
]);

const EDITORIAL_IMAGE_SOURCES = new Set([
  "openai",
  "upload",
  "manual",
  "generated",
]);

function isStockImageSource(source: string | undefined | null): boolean {
  const s = String(source ?? "").trim().toLowerCase();
  return Boolean(s) && STOCK_IMAGE_SOURCES.has(s);
}

/**
 * True when a gallery row should be hidden on the public /gallery page
 * (free stock photos from Pexels, Pixabay, Unsplash, Wikimedia, etc.).
 */
export function isPublicGalleryStockMedia(
  item: GalleryStockCheckInput,
  stockBlogSlugs?: ReadonlySet<string>,
): boolean {
  if (item.type === "video") return false;

  const src = String(item.source ?? "").trim().toLowerCase();
  if (src === "manual" || src === "admin" || src === "upload") {
    return false;
  }

  if (item.editorialImage === true) return false;

  const url = String(item.mediaUrl ?? "").trim();
  const poster = String(item.posterUrl ?? "").trim();
  if (isFreeStockImageUrl(url) || isFreeStockImageUrl(poster)) return true;
  if (url.includes("wikimedia.org") || poster.includes("wikimedia.org")) {
    return true;
  }

  const imageSource = String(item.imageSource ?? "").trim().toLowerCase();
  if (isStockImageSource(imageSource)) return true;
  if (EDITORIAL_IMAGE_SOURCES.has(imageSource)) return false;
  if (isBlogStockImageMeta(item.imageMeta)) return true;

  const slug = String(item.sourceSlug ?? "").trim();
  if (slug && stockBlogSlugs?.has(slug)) return true;

  return false;
}

export function shouldShowInPublicGallery(
  item: GalleryStockCheckInput,
  stockBlogSlugs?: ReadonlySet<string>,
): boolean {
  return !isPublicGalleryStockMedia(item, stockBlogSlugs);
}

export function filterPublicGalleryItems<T extends GalleryStockCheckInput>(
  items: T[],
  stockBlogSlugs?: ReadonlySet<string>,
): T[] {
  return items.filter((item) => shouldShowInPublicGallery(item, stockBlogSlugs));
}
