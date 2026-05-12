import sharp from "sharp";

/**
 * Result of converting an admin-uploaded hero image to a web-optimized WebP.
 */
export type HeroImageConversion = {
  /** WebP-encoded image buffer. */
  buffer: Buffer;
  /** Always `image/webp`. */
  contentType: "image/webp";
  /** Final WebP byte length. */
  bytes: number;
  /** Pixel width after resize (≤ MAX_WIDTH). */
  width: number;
  /** WebP encoder quality that produced `buffer` (after auto-step-down). */
  quality: number;
};

export type HeroImageCompressOptions = {
  /** Target max pixel width. Hero banner spec → 1200 px. */
  maxWidth?: number;
  /** Hard upper bound on output bytes. Hero banner spec → 200 KB. */
  maxBytes?: number;
  /** Starting WebP quality (steps down to meet `maxBytes`). */
  startQuality?: number;
  /** Lowest quality we’re willing to drop to before giving up the size budget. */
  minQuality?: number;
};

export const HERO_BANNER_MAX_WIDTH = 1200;
export const HERO_BANNER_MAX_BYTES = 200 * 1024;

/**
 * Re-encode an arbitrary admin upload (JPEG, PNG, etc.) as a hero-banner-ready
 * WebP:
 *
 * - Resized so width ≤ `maxWidth` (default 1200 px).
 * - Encoded as WebP at the highest quality that fits under `maxBytes`
 *   (default 200 KB). We step the quality down in small increments from
 *   `startQuality` (default 78) towards `minQuality` (default 50).
 * - EXIF metadata is stripped (no orientation surprises, smaller file).
 *
 * Returns the final encoded buffer plus diagnostics so the API route can log
 * what it produced.
 */
export async function compressHeroBannerImage(
  input: Buffer,
  options: HeroImageCompressOptions = {},
): Promise<HeroImageConversion> {
  const maxWidth = options.maxWidth ?? HERO_BANNER_MAX_WIDTH;
  const maxBytes = options.maxBytes ?? HERO_BANNER_MAX_BYTES;
  const startQuality = clamp(options.startQuality ?? 78, 30, 95);
  const minQuality = clamp(options.minQuality ?? 50, 30, startQuality);

  const pipeline = sharp(input, { failOn: "none" })
    .rotate()
    .resize({
      width: maxWidth,
      withoutEnlargement: true,
      fit: "inside",
    });

  let quality = startQuality;
  let best: HeroImageConversion | null = null;

  while (quality >= minQuality) {
    const { data, info } = await pipeline
      .clone()
      .webp({
        quality,
        effort: 5,
      })
      .toBuffer({ resolveWithObject: true });

    const conversion: HeroImageConversion = {
      buffer: Buffer.from(data),
      contentType: "image/webp",
      bytes: info.size,
      width: info.width,
      quality,
    };

    if (conversion.bytes <= maxBytes) {
      return conversion;
    }

    best = conversion;
    quality -= 6;
  }

  return best ?? {
    buffer: input,
    contentType: "image/webp",
    bytes: input.byteLength,
    width: maxWidth,
    quality: minQuality,
  };
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}
