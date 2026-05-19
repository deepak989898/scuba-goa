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

function buildWatermarkSvg(width: number, height: number, label: string): Buffer {
  const host = SITE_URL.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const text = escapeXml(`${label} · ${host}`);
  const fontSize = Math.max(16, Math.round(width * 0.032));
  const tileW = Math.round(width * 0.5);
  const tileH = Math.round(height * 0.2);
  const rows = Math.ceil(height / tileH) + 1;
  const cols = Math.ceil(width / tileW) + 1;
  let tiles = "";
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const x = c * tileW - tileW * 0.2;
      const y = r * tileH + tileH * 0.55;
      tiles += `<text x="${x}" y="${y}" transform="rotate(-22 ${x} ${y})" font-family="Arial,Helvetica,sans-serif" font-size="${fontSize}" font-weight="700" fill="#ffffff" fill-opacity="0.22">${text}</text>`;
    }
  }
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${tiles}</svg>`;
  return Buffer.from(svg);
}

function buildBrandBarWithLogoSvg(
  width: number,
  barHeight: number,
  label: string,
  host: string,
  logoWidth: number,
): Buffer {
  const safeLabel = escapeXml(label);
  const safeHost = escapeXml(host);
  const textX = logoWidth > 0 ? logoWidth + 20 : 16;
  const svg = `<svg width="${width}" height="${barHeight}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#0c4a6e"/>
      <stop offset="100%" stop-color="#0369a1"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${barHeight}" fill="url(#g)" fill-opacity="0.94"/>
  <text x="${textX}" y="${Math.round(barHeight * 0.64)}" font-family="Arial,Helvetica,sans-serif" font-size="${Math.max(14, Math.round(barHeight * 0.36))}" font-weight="700" fill="#ffffff">${safeLabel}</text>
  <text x="${width - 14}" y="${Math.round(barHeight * 0.64)}" text-anchor="end" font-family="Arial,Helvetica,sans-serif" font-size="${Math.max(12, Math.round(barHeight * 0.3))}" fill="#e0f2fe">${safeHost}</text>
</svg>`;
  return Buffer.from(svg);
}

async function applyBrandOverlay(photoBuffer: Buffer): Promise<Buffer> {
  const resizedBuf = await sharp(photoBuffer)
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .toBuffer();

  const meta = await sharp(resizedBuf).metadata();
  const width = meta.width ?? MAX_WIDTH;
  const height = meta.height ?? Math.round(width * 0.56);
  const host = SITE_URL.replace(/^https?:\/\//, "").replace(/\/$/, "");

  const barHeight = Math.max(52, Math.round(height * 0.11));
  const composites: sharp.OverlayOptions[] = [
    {
      input: buildWatermarkSvg(width, height, SITE_NAME),
      top: 0,
      left: 0,
    },
  ];

  const logoRaw = await loadBrandLogoBuffer();
  const logoMaxH = Math.round(barHeight * 0.78);
  const logoMaxW = Math.round(width * 0.2);
  const logoBuf = await sharp(logoRaw)
    .resize(logoMaxW, logoMaxH, { fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();
  const logoMeta = await sharp(logoBuf).metadata();
  const logoW = logoMeta.width ?? logoMaxW;
  const logoH = logoMeta.height ?? logoMaxH;
  const logoSlotWidth = logoW + 16;

  composites.push({
    input: buildBrandBarWithLogoSvg(width, barHeight, SITE_NAME, host, logoSlotWidth),
    top: height - barHeight,
    left: 0,
  });

  const logoTop = height - barHeight + Math.round((barHeight - logoH) / 2);
  composites.push({
    input: logoBuf,
    top: Math.max(0, logoTop),
    left: 12,
  });

  return sharp(resizedBuf).composite(composites).webp({ quality: WEBP_QUALITY }).toBuffer();
}

export async function downloadCompressUploadBlogImage(input: {
  imageUrl: string;
  slug: string;
}): Promise<{ featuredImageUrl: string; ogImageUrl: string }> {
  const app = getAdminApp();
  if (!app) throw new Error("Firebase Admin not configured");

  const bucketName =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    process.env.FIREBASE_STORAGE_BUCKET;
  if (!bucketName) throw new Error("Storage bucket not configured");

  const res = await fetch(input.imageUrl, {
    headers: { "User-Agent": "BlueSharkGoa-BlogBot/1.0" },
  });
  if (!res.ok) throw new Error(`Failed to download image: ${res.status}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  const compressed = await applyBrandOverlay(buffer);

  const storagePath = `blog/${input.slug}/featured.webp`;
  const bucket = getStorage(app).bucket(bucketName);
  const file = bucket.file(storagePath);
  await file.save(compressed, {
    metadata: {
      contentType: "image/webp",
      cacheControl: "public, max-age=31536000, immutable",
    },
  });
  await file.makePublic();
  const publicUrl = `https://storage.googleapis.com/${bucketName}/${storagePath}`;
  return { featuredImageUrl: publicUrl, ogImageUrl: publicUrl };
}
