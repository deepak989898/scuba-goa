import type { GalleryCategoryId } from "@/lib/gallery-categories";

export type HomeGalleryItem = {
  type: "image" | "video";
  mediaUrl: string;
  posterUrl?: string;
  alt: string;
  category?: GalleryCategoryId;
  source?: string;
  sourceSlug?: string;
  /** Blog image pipeline source (openai, pexels, upload, …). */
  imageSource?: string;
  /** True when synced from an editorial (non-stock) blog image. */
  editorialImage?: boolean;
  /** Exact file hash when known (blog image pipeline). */
  sha256?: string;
  /** Perceptual hash for near-duplicate detection. */
  perceptualHash?: string;
};

/** Empty when Firestore `homeGallery` is empty — no stock Unsplash grid. */
export const DEFAULT_HOME_GALLERY: HomeGalleryItem[] = [];
