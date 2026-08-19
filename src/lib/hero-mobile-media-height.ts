/** Mobile hero cap — matches HeroSection `max-sm:h-[min(58dvh,460px)]`. */
export const MOBILE_HERO_MEDIA_MAX_PX = 460;
export const MOBILE_HERO_MEDIA_MAX_VH = 0.58;

/**
 * Shrink mobile hero media when the video is wider than the hero box (letterbox gap).
 * Tall videos stay capped at max height (crop with cover).
 */
export function computeMobileHeroMediaHeightPx(
  viewportWidth: number,
  viewportHeight: number,
  mediaWidth: number,
  mediaHeight: number,
): number {
  const maxH = Math.min(
    viewportHeight * MOBILE_HERO_MEDIA_MAX_VH,
    MOBILE_HERO_MEDIA_MAX_PX,
  );
  if (mediaWidth <= 0 || mediaHeight <= 0) return maxH;
  const naturalH = viewportWidth * (mediaHeight / mediaWidth);
  return Math.min(maxH, naturalH);
}

/** Overlap booking card into hero — scales down when media is shorter. */
export function computeMobileHeroCardOverlapPx(
  mediaHeightPx: number,
  viewportWidth: number,
): number {
  return Math.min(mediaHeightPx * 0.42, viewportWidth * 0.28, 152);
}
