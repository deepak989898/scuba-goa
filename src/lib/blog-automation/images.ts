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

const BAR_HOST_PNG = "blog-bar-host.png";

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

function buildBrandBarBackground(width: number, barHeight: number): Buffer {
  const svg = `<svg width="${width}" height="${barHeight}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#0c4a6e"/>
      <stop offset="100%" stop-color="#0369a1"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${barHeight}" fill="url(#g)" fill-opacity="0.94"/>
</svg>`;
  return Buffer.from(svg);
}

/** Full-width bottom bar with logo (left) + site URL (right), nothing cropped. */
async function buildBrandBarLayer(
  width: number,
  barHeight: number,
): Promise<Buffer> {
  const padY = 10;
  const padX = 16;
  const innerH = barHeight - padY * 2;

  const composites: sharp.OverlayOptions[] = [
    { input: buildBrandBarBackground(width, barHeight), top: 0, left: 0 },
  ];

  const logoRaw = await loadBrandLogoBuffer();
  const logoMaxW = Math.round(width * 0.42);
  const logoBuf = await sharp(logoRaw)
    .resize(logoMaxW, innerH, { fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();
  const logoMeta = await sharp(logoBuf).metadata();
  const logoW = logoMeta.width ?? logoMaxW;
  const logoH = logoMeta.height ?? innerH;
  composites.push({
    input: logoBuf,
    top: padY + Math.round((innerH - logoH) / 2),
    left: padX,
  });

  const hostPng = await readPublicAsset(BAR_HOST_PNG);
  if (hostPng) {
    const hostMaxW = Math.round(width * 0.32);
    const hostBuf = await sharp(hostPng)
      .resize(hostMaxW, innerH, { fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
    const hostMeta = await sharp(hostBuf).metadata();
    const hostW = hostMeta.width ?? hostMaxW;
    const hostH = hostMeta.height ?? innerH;
    composites.push({
      input: hostBuf,
      top: padY + Math.round((innerH - hostH) / 2),
      left: Math.max(padX + logoW + 12, width - hostW - padX),
    });
  }

  return sharp({
    create: {
      width,
      height: barHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toBuffer();
}

/** Resize to WebP + bottom brand bar (logo left, site URL right). No text watermark. */
export async function applyBrandOverlay(photoBuffer: Buffer): Promise<Buffer> {
  const resizedBuf = await sharp(photoBuffer)
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .toBuffer();

  const meta = await sharp(resizedBuf).metadata();
  const width = meta.width ?? MAX_WIDTH;
  const height = meta.height ?? Math.round(width * 0.56);
  const barHeight = Math.max(80, Math.round(height * 0.14));

  const barLayer = await buildBrandBarLayer(width, barHeight);

  return sharp(resizedBuf)
    .composite([{ input: barLayer, top: height - barHeight, left: 0 }])
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

  const storagePath = `blog/${slug}/featured.webp`;
  const bucket = getStorage(app).bucket(bucketName);
  const file = bucket.file(storagePath);
  await file.save(webpBuffer, {
    metadata: {
      contentType: "image/webp",
      cacheControl: "public, max-age=31536000, immutable",
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
