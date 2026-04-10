const DEFAULT_HERO_POSTER_FALLBACK =
  "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1920&q=80";

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
};

/** Poster/thumbnail shown for hero video slides (custom thumb → main image → default). */
export function getHeroVideoPosterSrc(slide: HeroSlide): string {
  const t = slide.videoThumbnailUrl?.trim();
  if (t) return t;
  const s = slide.src?.trim();
  if (s) return s;
  return DEFAULT_HERO_POSTER_FALLBACK;
}

export const DEFAULT_HERO_SLIDES: HeroSlide[] = [
  {
    src: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1920&q=80",
    alt: "Scuba diving in clear water",
  },
  {
    src: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80",
    alt: "Goa beach coastline",
  },
  {
    src: "https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=1920&q=80",
    alt: "Water sports at sea",
  },
];
