import type { GoaHotelDoc } from "./types";

export function pickHotelHeroImage(hotel: GoaHotelDoc): string {
  return hotel.heroImage || hotel.imageUrls[0] || hotel.images[0] || "";
}

/** Gallery on detail page — Safar Sathi exports often have 50+ images. */
export function pickHotelGalleryImages(hotel: GoaHotelDoc, max = 50): string[] {
  const hero = pickHotelHeroImage(hotel);
  const merged = [...new Set([hero, ...hotel.images, ...hotel.imageUrls])].filter(Boolean);
  return merged.slice(0, max);
}
