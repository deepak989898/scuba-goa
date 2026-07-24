import { readFile } from "fs/promises";
import path from "path";
import { getStorage } from "firebase-admin/storage";
import sharp from "sharp";
import { getAdminApp } from "@/lib/firebase-admin";
import { SITE_URL } from "@/lib/constants";

const MAX_WIDTH = 1600;
const TARGET_HEIGHT = 900;
const WEBP_QUALITY = 82;
/** Logo ≤ ~9% of image width — subtle, not dominant. */
const LOGO_WIDTH_RATIO = 0.09;

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

async function buildTopLeftLogoBadge(imageWidth: number): Promise<Buffer> {
  const logoMaxW = Math.round(imageWidth * LOGO_WIDTH_RATIO);
  const logoMaxH = Math.max(28, Math.round(imageWidth * 0.04));

  const logoRaw = await loadBrandLogoBuffer();
  return sharp(logoRaw)
    .resize(logoMaxW, logoMaxH, { fit: "inside", withoutEnlargement: true })
    .ensureAlpha()
    .png()
    .toBuffer();
}

/** Resize toward 16:9 WebP; optionally composite subtle top-left logo. */
export async function applyBrandOverlay(
  photoBuffer: Buffer,
  options?: {
    brandingEnabled?: boolean;
    resizePosition?: "attention" | "centre" | "center";
  },
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const brandingEnabled = options?.brandingEnabled !== false;
  const position =
    options?.resizePosition === "centre" || options?.resizePosition === "center"
      ? "centre"
      : "attention";

  let pipeline = sharp(photoBuffer).rotate().resize({
    width: MAX_WIDTH,
    height: TARGET_HEIGHT,
    fit: "cover",
    position,
    withoutEnlargement: false,
  });

  let resizedBuf = await pipeline.toBuffer();
  const meta = await sharp(resizedBuf).metadata();
  const width = meta.width ?? MAX_WIDTH;
  const height = meta.height ?? TARGET_HEIGHT;

  if (brandingEnabled) {
    try {
      const logoBadge = await buildTopLeftLogoBadge(width);
      const margin = Math.max(12, Math.round(width * 0.018));
      resizedBuf = await sharp(resizedBuf)
        .composite([{ input: logoBadge, top: margin, left: margin }])
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
    } catch {
      resizedBuf = await sharp(resizedBuf).webp({ quality: WEBP_QUALITY }).toBuffer();
    }
  } else {
    resizedBuf = await sharp(resizedBuf).webp({ quality: WEBP_QUALITY }).toBuffer();
  }

  const outMeta = await sharp(resizedBuf).metadata();
  return {
    buffer: resizedBuf,
    width: outMeta.width ?? width,
    height: outMeta.height ?? height,
  };
}

export type UploadBlogImageResult = {
  featuredImageUrl: string;
  ogImageUrl: string;
  storagePath: string;
  width: number;
  height: number;
  fileSize: number;
  mimeType: string;
  brandingApplied: boolean;
};

async function uploadWebpToStorage(
  webpBuffer: Buffer,
  input: { slug: string; articleId?: string },
): Promise<UploadBlogImageResult> {
  const app = getAdminApp();
  if (!app) throw new Error("Firebase Admin not configured");

  const bucketName =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    process.env.FIREBASE_STORAGE_BUCKET;
  if (!bucketName) throw new Error("Storage bucket not configured");

  const version = Date.now().toString(36);
  const unique = Math.random().toString(36).slice(2, 8);
  const articleKey = (input.articleId || input.slug)
    .replace(/[^a-z0-9_-]/gi, "-")
    .slice(0, 80);
  // Unique path per article + timestamp — never overwrite shared filenames
  const storagePath = `blog/${articleKey}/hero/${version}-${unique}.webp`;
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
  const meta = await sharp(webpBuffer).metadata();
  return {
    featuredImageUrl: publicUrl,
    ogImageUrl: publicUrl,
    storagePath,
    width: meta.width ?? MAX_WIDTH,
    height: meta.height ?? TARGET_HEIGHT,
    fileSize: webpBuffer.length,
    mimeType: "image/webp",
    brandingApplied: true,
  };
}

export async function brandAndUploadBlogImageBuffer(
  imageBuffer: Buffer,
  slug: string,
  options?: {
    articleId?: string;
    brandingEnabled?: boolean;
    resizePosition?: "attention" | "centre" | "center";
  },
): Promise<UploadBlogImageResult> {
  const brandingEnabled = options?.brandingEnabled !== false;
  const compressed = await applyBrandOverlay(imageBuffer, {
    brandingEnabled,
    resizePosition: options?.resizePosition,
  });
  const uploaded = await uploadWebpToStorage(compressed.buffer, {
    slug,
    articleId: options?.articleId || slug,
  });
  return {
    ...uploaded,
    width: compressed.width,
    height: compressed.height,
    brandingApplied: brandingEnabled,
  };
}

export async function downloadCompressUploadBlogImage(input: {
  imageUrl: string;
  slug: string;
  articleId?: string;
  brandingEnabled?: boolean;
}): Promise<UploadBlogImageResult> {
  const res = await fetch(input.imageUrl, {
    headers: { "User-Agent": "BlueSharkGoa-BlogBot/1.0" },
  });
  if (!res.ok) throw new Error(`Failed to download image: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  return brandAndUploadBlogImageBuffer(buffer, input.slug, {
    articleId: input.articleId,
    brandingEnabled: input.brandingEnabled,
  });
}
