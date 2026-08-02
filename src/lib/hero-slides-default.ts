import {
  SITE_IMAGE_PLACEHOLDER,
  sanitizePublicImageUrl,
} from "@/lib/cms-image";

const DEFAULT_HERO_POSTER_FALLBACK = SITE_IMAGE_PLACEHOLDER;

/**
 * `src` is the main image URL (fallback poster for video if `videoThumbnailUrl` is unset).
 * `videoThumbnailUrl`: optional frame shown before/during hero video (native `poster` + YouTube underlay).
 * `useAmbientMusic`: mute video and play `NEXT_PUBLIC_HERO_FALLBACK_MUSIC_URL` (for silent clips
 * or when the browser cannot detect audio — e.g. Chrome).
 */
export type HeroSlide = {
  src: string;
  alt: string;
  videoUrl?: string;
  /** Admin-only override for video poster; if empty, `src` is used. */
  videoThumbnailUrl?: string;
  useAmbientMusic?: boolean;
  /**
   * Encoded booking target for this slide (`pkg|…`, `svcb|…`, `svc|…`) — see `booking-selection.ts`.
   * When set, hero “Book” actions deep-link to `/booking?opt=…` and the card reflects that offer.
   */
  bookingOption?: string;
};

/** Poster/thumbnail shown for hero video slides (custom thumb → main image → placeholder). */
export function getHeroVideoPosterSrc(slide: HeroSlide): string {
  const t = sanitizePublicImageUrl(slide.videoThumbnailUrl);
  if (t) return t;
  const s = sanitizePublicImageUrl(slide.src);
  if (s) return s;
  return DEFAULT_HERO_POSTER_FALLBACK;
}

/** Empty by default — public site waits for admin heroSlides (no stock Unsplash). */
export const DEFAULT_HERO_SLIDES: HeroSlide[] = [];
