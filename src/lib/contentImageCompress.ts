import sharp from "sharp";

export type ContentImageProfile = "hero" | "featured" | "card" | "og" | "thumbnail";

export type ContentImageConversion = {
  buffer: Buffer;
  contentType: "image/webp";
  bytes: number;
  width: number;
  height: number;
  quality: number;
  profile: ContentImageProfile;
};

const PROFILE_DEFAULTS: Record<
  ContentImageProfile,
  { maxWidth: number; maxBytes: number; startQuality: number; minQuality: number }
> = {
  hero: { maxWidth: 1920, maxBytes: 280 * 1024, startQuality: 82, minQuality: 55 },
  featured: { maxWidth: 1600, maxBytes: 320 * 1024, startQuality: 82, minQuality: 55 },
  card: { maxWidth: 1200, maxBytes: 220 * 1024, startQuality: 80, minQuality: 52 },
  og: { maxWidth: 1200, maxBytes: 300 * 1024, startQuality: 82, minQuality: 55 },
  thumbnail: { maxWidth: 600, maxBytes: 100 * 1024, startQuality: 78, minQuality: 50 },
};

const ALLOWED_INPUT = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
]);

export function isAllowedImageMime(mime: string | undefined): boolean {
  if (!mime) return true; // sniff via sharp
  const m = mime.toLowerCase().split(";")[0]!.trim();
  return ALLOWED_INPUT.has(m) || m === "application/octet-stream";
}

/**
 * Re-encode admin uploads to WebP at profile-appropriate width/quality.
 * Preserves alpha when present. Strips EXIF via rotate().
 */
export async function compressContentImage(
  input: Buffer,
  profile: ContentImageProfile = "card",
): Promise<ContentImageConversion> {
  const cfg = PROFILE_DEFAULTS[profile];
  const pipeline = sharp(input, { failOn: "none" })
    .rotate()
    .resize({
      width: cfg.maxWidth,
      withoutEnlargement: true,
      fit: "inside",
    });

  let quality = cfg.startQuality;
  let best: ContentImageConversion | null = null;

  while (quality >= cfg.minQuality) {
    const { data, info } = await pipeline
      .clone()
      .webp({ quality, effort: 5 })
      .toBuffer({ resolveWithObject: true });

    const conversion: ContentImageConversion = {
      buffer: Buffer.from(data),
      contentType: "image/webp",
      bytes: info.size,
      width: info.width,
      height: info.height,
      quality,
      profile,
    };

    if (conversion.bytes <= cfg.maxBytes) {
      return conversion;
    }

    best = conversion;
    quality -= 6;
  }

  if (best) return best;

  throw new Error("Could not encode image as WebP");
}
