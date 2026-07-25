/**
 * Regenerates public/icons/* from the brand logo (full mark on ocean bg).
 * Run: npm run generate:pwa-icons
 */
import sharp from "sharp";
import fs from "fs";
import path from "path";

const out = path.join("public", "icons");
fs.mkdirSync(out, { recursive: true });

const srcLogo = "public/book-scuba-goa-logo-transparent.png";
const srcLogoFallback = "public/book-scuba-goa-logo.png";
const srcAppIcon = "src/app/icon.png";
const bg = { r: 12, g: 74, b: 110, alpha: 1 };

async function logoOnOcean(size, file, padRatio) {
  const pad = Math.round(size * padRatio);
  const inner = size - pad * 2;
  let logoPath = srcLogo;
  if (!fs.existsSync(logoPath)) logoPath = srcLogoFallback;
  if (!fs.existsSync(logoPath)) logoPath = srcAppIcon;

  const logoBuf = await sharp(logoPath)
    .resize(inner, inner, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  await sharp({
    create: { width: size, height: size, channels: 4, background: bg },
  })
    .composite([{ input: logoBuf, left: pad, top: pad }])
    .png()
    .toFile(file);
}

await logoOnOcean(192, path.join(out, "icon-192.png"), 0.08);
await logoOnOcean(512, path.join(out, "icon-512.png"), 0.08);
await logoOnOcean(192, path.join(out, "maskable-192.png"), 0.18);
await logoOnOcean(512, path.join(out, "maskable-512.png"), 0.18);
await logoOnOcean(180, path.join(out, "apple-touch-icon.png"), 0.08);
await logoOnOcean(512, path.join("public", "icon-512.png"), 0.08);

console.log("PWA icons ready:", fs.readdirSync(out));
