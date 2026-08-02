import { sanitizePublicImageUrl } from "@/lib/cms-image";

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

function heroMediaUrl(url: string | undefined | null): string {
  const t = sanitizePublicImageUrl(url);
  if (!t) return "";
  // Never use the booking banner as a hero poster (homepage refresh flash).
  if (t.includes("booking-header")) return "";
  return t;
}

/** Poster/thumbnail for hero video — admin thumb/src only; empty → solid ocean (no banner). */
export function getHeroVideoPosterSrc(slide: HeroSlide): string {
  const t = heroMediaUrl(slide.videoThumbnailUrl);
  if (t) return t;
  return heroMediaUrl(slide.src);
}

/** Empty by default — public site waits for admin heroSlides (no stock Unsplash). */
export const DEFAULT_HERO_SLIDES: HeroSlide[] = [];
