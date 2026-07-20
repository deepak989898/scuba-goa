import { readFile } from "fs/promises";
import path from "path";
import { getStorage } from "firebase-admin/storage";
import sharp from "sharp";
import { getAdminApp } from "@/lib/firebase-admin";
import { SITE_URL } from "@/lib/constants";

const MAX_WIDTH = 1200;
const WEBP_QUALITY = 82;

const LOGO_FILES = [
  "book-scuba-goa-logo-transparent.webp",
  "book-scuba-goa-logo-transparent.png",
  "book-scuba-goa-logo.webp",
  "book-scuba-goa-logo.png",
];

async function readPublicAsset(name: string): Promise<Buffer | null> {
  const siteBase = SITE_URL.replace(/\/$/, "");
  try {
    const res = await fetch(`${siteBase}/${name}`, {
      headers: { "User-Agent": "BlueSharkGoa-BlogBot/1.0" },
      cache: "force-cache",
    });
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 50) return buf;
    }
  } catch {
    /* fallback local */
  }
  try {
    return await readFile(path.join(process.cwd(), "public", name));
  } catch {
    return null;
  }
}

async function loadBrandLogoBuffer(): Promise<Buffer> {
  for (const name of LOGO_FILES) {
    const buf = await readPublicAsset(name);
    if (buf) return buf;
  }
  throw new Error("Brand logo not found");
}

/**
 * Top-left watermark: site logo (already includes “Book Scuba Goa”) on a
 * fully transparent background — no solid bottom bar.
 */
async function buildTopLeftLogoBadge(imageWidth: number): Promise<Buffer> {
  // Subtle brand mark — keep small so it does not dominate the hero.
  const logoMaxW = Math.round(imageWidth * 0.18);
  const logoMaxH = Math.max(36, Math.round(imageWidth * 0.055));

  const logoRaw = await loadBrandLogoBuffer();
  return sharp(logoRaw)
    .resize(logoMaxW, logoMaxH, { fit: "inside", withoutEnlargement: true })
    .ensureAlpha()
    .png()
    .toBuffer();
}

/** Resize to WebP + top-left transparent logo (no bottom bar). */
export async function applyBrandOverlay(photoBuffer: Buffer): Promise<Buffer> {
  const resizedBuf = await sharp(photoBuffer)
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .toBuffer();

  const meta = await sharp(resizedBuf).metadata();
  const width = meta.width ?? MAX_WIDTH;
  const logoBadge = await buildTopLeftLogoBadge(width);
  const margin = Math.max(14, Math.round(width * 0.022));

  return sharp(resizedBuf)
    .composite([{ input: logoBadge, top: margin, left: margin }])
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
}

async function uploadWebpToStorage(
  webpBuffer: Buffer,
  slug: string,
): Promise<{ featuredImageUrl: string; ogImageUrl: string }> {
  const app = getAdminApp();
  if (!app) throw new Error("Firebase Admin not configured");

  const bucketName =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    process.env.FIREBASE_STORAGE_BUCKET;
  if (!bucketName) throw new Error("Storage bucket not configured");

  // Versioned path so each replace gets a new public URL. Overwriting the same
  // `featured.webp` kept browsers/CDNs on the old bytes for up to a year.
  const version = Date.now().toString(36);
  const storagePath = `blog/${slug}/featured-${version}.webp`;
  const bucket = getStorage(app).bucket(bucketName);
  const file = bucket.file(storagePath);
  await file.save(webpBuffer, {
    metadata: {
      contentType: "image/webp",
      cacheControl: "public, max-age=86400",
    },
  });
  await file.makePublic();
  const publicUrl = `https://storage.googleapis.com/${bucketName}/${storagePath}`;
  return { featuredImageUrl: publicUrl, ogImageUrl: publicUrl };
}

export async function brandAndUploadBlogImageBuffer(
  imageBuffer: Buffer,
  slug: string,
): Promise<{ featuredImageUrl: string; ogImageUrl: string }> {
  const compressed = await applyBrandOverlay(imageBuffer);
  return uploadWebpToStorage(compressed, slug);
}

export async function downloadCompressUploadBlogImage(input: {
  imageUrl: string;
  slug: string;
}): Promise<{ featuredImageUrl: string; ogImageUrl: string }> {
  const res = await fetch(input.imageUrl, {
    headers: { "User-Agent": "BlueSharkGoa-BlogBot/1.0" },
  });
  if (!res.ok) throw new Error(`Failed to download image: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  return brandAndUploadBlogImageBuffer(buffer, input.slug);
}
