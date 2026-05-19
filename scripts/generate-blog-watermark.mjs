/**
 * Run once locally: node scripts/generate-blog-watermark.mjs
 * Bakes "Book Scuba Goa" into PNG tiles (SVG text fails on Vercel/librsvg).
 */
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");

const tileW = 420;
const tileH = 72;
const watermarkSvg = `<svg width="${tileW}" height="${tileH}" xmlns="http://www.w3.org/2000/svg">
  <text x="${tileW / 2}" y="${tileH / 2 + 12}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="36" font-weight="700" fill="#ffffff" fill-opacity="0.32">Book Scuba Goa</text>
</svg>`;

const hostSvg = `<svg width="280" height="48" xmlns="http://www.w3.org/2000/svg">
  <text x="280" y="34" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="600" fill="#ffffff">bookscubagoa.com</text>
</svg>`;

await sharp(Buffer.from(watermarkSvg))
  .png()
  .toFile(path.join(publicDir, "blog-watermark-tile.png"));

await sharp(Buffer.from(hostSvg))
  .png()
  .toFile(path.join(publicDir, "blog-bar-host.png"));

console.log("Wrote public/blog-watermark-tile.png and public/blog-bar-host.png");
