import { readFile } from "fs/promises";
import path from "path";
import { getStorage } from "firebase-admin/storage";
import sharp from "sharp";
import { getAdminApp } from "@/lib/firebase-admin";
import { SITE_NAME, SITE_URL } from "@/lib/constants";

const MAX_WIDTH = 1200;
const WEBP_QUALITY = 82;

const LOGO_FILES = [
  "book-scuba-goa-logo-transparent.webp",
  "book-scuba-goa-logo-transparent.png",
  "book-scuba-goa-logo.webp",
  "book-scuba-goa-logo.png",
];

/** ASCII-only host for SVG text (avoids empty boxes in sharp/librsvg). */
function siteHostAscii(): string {
  return SITE_URL.replace(/^https?:\/\//i, "").replace(/\/$/, "").toLowerCase();
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function loadBrandLogoBuffer(): Promise<Buffer> {
  const siteBase = SITE_URL.replace(/\/$/, "");

  for (const name of LOGO_FILES) {
    try {
      const res = await fetch(`${siteBase}/${name}`, {
        headers: { "User-Agent": "BlueSharkGoa-BlogBot/1.0" },
        cache: "force-cache",
      });
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 100) return buf;
      }
    } catch {
      /* try next */
    }
  }

  const publicDir = path.join(process.cwd(), "public");
  for (const name of LOGO_FILES) {
    try {
      return await readFile(path.join(publicDir, name));
    } catch {
      /* try next */
    }
  }

  throw new Error("Brand logo not found (tried site URL and public/)");
}

function buildWatermarkSvg(width: number, height: number): Buffer {
  const host = siteHostAscii();
  const line1 = escapeXml(SITE_NAME);
  const line2 = escapeXml(host);
  const fontSize = Math.max(15, Math.round(width * 0.03));
  const tileW = Math.round(width * 0.48);
  const tileH = Math.round(height * 0.18);
  const rows = Math.ceil(height / tileH) + 1;
  const cols = Math.ceil(width / tileW) + 1;
  let tiles = "";
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const x = c * tileW - tileW * 0.15;
      const y = r * tileH + tileH * 0.45;
      tiles += `<text x="${x}" y="${y}" transform="rotate(-22 ${x} ${y})" font-family="sans-serif" font-size="${fontSize}" font-weight="700" fill="#ffffff" fill-opacity="0.2">${line1}</text>`;
      tiles += `<text x="${x}" y="${y + fontSize + 4}" transform="rotate(-22 ${x} ${y + fontSize + 4})" font-family="sans-serif" font-size="${Math.round(fontSize * 0.85)}" fill="#ffffff" fill-opacity="0.16">${line2}</text>`;
    }
  }
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${tiles}</svg>`;
  return Buffer.from(svg);
}

function buildBrandBarSvg(width: number, barHeight: number, host: string): Buffer {
  const safeHost = escapeXml(host);
  const fontSize = Math.max(13, Math.round(barHeight * 0.34));
  const svg = `<svg width="${width}" height="${barHeight}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#0c4a6e"/>
      <stop offset="100%" stop-color="#0369a1"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${barHeight}" fill="url(#g)" fill-opacity="0.94"/>
  <text x="${width - 16}" y="${Math.round(barHeight * 0.68)}" text-anchor="end" font-family="sans-serif" font-size="${fontSize}" font-weight="600" fill="#ffffff">${safeHost}</text>
</svg>`;
  return Buffer.from(svg);
}

export async function applyBrandOverlay(photoBuffer: Buffer): Promise<Buffer> {
  const resizedBuf = await sharp(photoBuffer)
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .toBuffer();

  const meta = await sharp(resizedBuf).metadata();
  const width = meta.width ?? MAX_WIDTH;
  const height = meta.height ?? Math.round(width * 0.56);
  const host = siteHostAscii();

  const barHeight = Math.max(56, Math.round(height * 0.12));
  const composites: sharp.OverlayOptions[] = [
    { input: buildWatermarkSvg(width, height), top: 0, left: 0 },
    { input: buildBrandBarSvg(width, barHeight, host), top: height - barHeight, left: 0 },
  ];

  const logoRaw = await loadBrandLogoBuffer();
  const logoMaxH = Math.round(barHeight * 0.82);
  const logoMaxW = Math.round(width * 0.22);
  const logoBuf = await sharp(logoRaw)
    .resize(logoMaxW, logoMaxH, { fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();
  const logoMeta = await sharp(logoBuf).metadata();
  const logoH = logoMeta.height ?? logoMaxH;
  const logoTop = height - barHeight + Math.round((barHeight - logoH) / 2);

  composites.push({
    input: logoBuf,
    top: Math.max(0, logoTop),
    left: 14,
  });

  return sharp(resizedBuf).composite(composites).webp({ quality: WEBP_QUALITY }).toBuffer();
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
