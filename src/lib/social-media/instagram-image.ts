import sharp from "sharp";
import { SITE_URL } from "@/lib/constants";
import { downloadMediaBytes } from "@/lib/social-media/firebase-media-fetch";

const MAX_JPEG_BYTES = 8 * 1024 * 1024;

/**
 * Instagram cannot reliably fetch Firebase token URLs (error subcode 2207052).
 * Route images through our site as JPEG so Meta's crawler can download them.
 */
export function resolveInstagramImageUrl(sourceUrl: string): string {
  const u = sourceUrl.trim();
  if (!/^https:\/\//i.test(u)) return u;
  const site = SITE_URL.replace(/\/$/, "");
  return `${site}/api/social-media/ig-media?u=${encodeURIComponent(u)}`;
}

export function isAllowedInstagramMediaSource(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    if (host.includes("firebasestorage.googleapis.com")) return true;
    if (host === "storage.googleapis.com" || host.endsWith(".storage.googleapis.com")) {
      return true;
    }
    if (host === "www.bookscubagoa.com" || host === "bookscubagoa.com") {
      return true;
    }
    if (host.includes("wikimedia.org")) return true;
    return false;
  } catch {
    return false;
  }
}

/** Convert any supported source image to Instagram-friendly JPEG (max 8 MB). */
export async function fetchImageAsInstagramJpeg(sourceUrl: string): Promise<Buffer> {
  const raw = await downloadMediaBytes(sourceUrl);
  let pipeline = sharp(raw).rotate();
  const meta = await pipeline.metadata();
  const width = meta.width ?? 0;
  if (width > 1440) {
    pipeline = pipeline.resize({ width: 1440, withoutEnlargement: true });
  }

  let quality = 85;
  let jpeg = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
  while (jpeg.length > MAX_JPEG_BYTES && quality > 45) {
    quality -= 10;
    jpeg = await sharp(jpeg).jpeg({ quality, mozjpeg: true }).toBuffer();
  }
  if (jpeg.length > MAX_JPEG_BYTES) {
    throw new Error("Image too large for Instagram (max 8 MB after compression)");
  }
  return jpeg;
}
