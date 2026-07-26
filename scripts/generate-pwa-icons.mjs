/**
 * Regenerates public/icons/* from the brand logo.
 * Run: npm run generate:pwa-icons
 *
 * Android home screens mask icons to a circle. A small circular logo on a big
 * sky tile looks “sunken”. We scale the emblem so the logo circle almost fills
 * the mask, with only a thin attractive sky-blue rim.
 */
import sharp from "sharp";
import fs from "fs";
import path from "path";

const out = path.join("public", "icons");
fs.mkdirSync(out, { recursive: true });

const srcLogo = "public/book-scuba-goa-logo-transparent.png";
const srcLogoFallback = "public/book-scuba-goa-logo.png";
const srcAppIcon = "src/app/icon.png";

/** Soft sky (center) → deeper cyan (edge) — reads clearly as a blue tile */
const SKY_CENTER = "#7dd3fc"; // sky-300
const SKY_EDGE = "#0284c7"; // sky-600
const SKY_FLAT = { r: 14, g: 165, b: 233, alpha: 1 }; // sky-500 fallback

function resolveLogoPath() {
  if (fs.existsSync(srcLogo)) return srcLogo;
  if (fs.existsSync(srcLogoFallback)) return srcLogoFallback;
  return srcAppIcon;
}

async function skyBackground(size) {
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="sky" cx="50%" cy="42%" r="72%">
          <stop offset="0%" stop-color="${SKY_CENTER}"/>
          <stop offset="70%" stop-color="#38bdf8"/>
          <stop offset="100%" stop-color="${SKY_EDGE}"/>
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#sky)"/>
    </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** Left circular mark + alpha bbox crop (tight). */
async function extractEmblem() {
  const logoPath = resolveLogoPath();
  const meta = await sharp(logoPath).metadata();
  const w = meta.width ?? 650;
  const h = meta.height ?? 238;
  const side = Math.min(w, h);
  const left = Math.min(Math.max(0, Math.round(side * 0.02)), w - side);

  const extracted = await sharp(logoPath)
    .extract({ left, top: 0, width: side, height: h })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data, info } = extracted;
  const { width, height, channels } = info;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * channels + 3] > 12) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX <= minX || maxY <= minY) {
    return sharp(logoPath)
      .extract({ left, top: 0, width: side, height: h })
      .png()
      .toBuffer();
  }

  return sharp(data, { raw: { width, height, channels } })
    .extract({
      left: minX,
      top: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    })
    .png()
    .toBuffer();
}

/**
 * @param {number} size
 * @param {string} file
 * @param {number} fillRatio logo size vs tile (0.84–0.88 = full logo + thin sky ring on Android round icons)
 */
async function emblemOnSky(size, file, fillRatio) {
  const emblemSrc = await extractEmblem();
  // Keep under 1 so logo is never cropped — whole mark stays visible
  const draw = Math.max(8, Math.round(size * Math.min(fillRatio, 0.98)));

  const emblemSized = await sharp(emblemSrc)
    .resize(draw, draw, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();

  const left = Math.round((size - draw) / 2);
  const top = Math.round((size - draw) / 2);

  const emblemBuf = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: emblemSized, left, top }])
    .png()
    .toBuffer();

  let bg;
  try {
    bg = await skyBackground(size);
  } catch {
    bg = await sharp({
      create: { width: size, height: size, channels: 4, background: SKY_FLAT },
    })
      .png()
      .toBuffer();
  }

  await sharp(bg)
    .composite([{ input: emblemBuf, left: 0, top: 0 }])
    .png()
    .toFile(file);
}

// Home-screen / apple — full logo centered; thin sky-blue ring (~12% padding)
await emblemOnSky(192, path.join(out, "icon-192.png"), 0.76);
await emblemOnSky(512, path.join(out, "icon-512.png"), 0.76);
await emblemOnSky(180, path.join(out, "apple-touch-icon.png"), 0.76);
await emblemOnSky(512, path.join("public", "icon-512.png"), 0.76);

// Android maskable — same look on round home-screen icons
await emblemOnSky(192, path.join(out, "maskable-192.png"), 0.74);
await emblemOnSky(512, path.join(out, "maskable-512.png"), 0.74);

console.log("PWA icons ready (full logo + thin sky ring):", fs.readdirSync(out));
