/**
 * Regenerates public/icons/* from the brand logo.
 * Run: npm run generate:pwa-icons
 *
 * Wide wordmark → crop left circular emblem, trim, then scale large on sky-blue
 * so the home-screen icon fills the tile (not a tiny sunk-in mark).
 */
import sharp from "sharp";
import fs from "fs";
import path from "path";

const out = path.join("public", "icons");
fs.mkdirSync(out, { recursive: true });

const srcLogo = "public/book-scuba-goa-logo-transparent.png";
const srcLogoFallback = "public/book-scuba-goa-logo.png";
const srcAppIcon = "src/app/icon.png";

/** Tailwind sky-400 */
const SKY = { r: 56, g: 189, b: 248, alpha: 1 };

function resolveLogoPath() {
  if (fs.existsSync(srcLogo)) return srcLogo;
  if (fs.existsSync(srcLogoFallback)) return srcLogoFallback;
  return srcAppIcon;
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

  // Fallback if empty
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
 * @param {number} fillRatio scale vs tile; >1 bleeds past edges so the sun circle fills the icon
 */
async function emblemOnSky(size, file, fillRatio) {
  const emblemSrc = await extractEmblem();
  const draw = Math.round(size * fillRatio);

  // cover = fill the square (palm may clip slightly; sun/diver stay dominant)
  let emblemPipeline = sharp(emblemSrc).resize(draw, draw, {
    fit: "cover",
    position: "centre",
    withoutEnlargement: false,
  });

  if (draw > size) {
    const offset = Math.round((draw - size) / 2);
    emblemPipeline = emblemPipeline.extract({
      left: offset,
      top: offset,
      width: size,
      height: size,
    });
  }

  const emblemSized = await emblemPipeline.png().toBuffer();
  const left = draw > size ? 0 : Math.round((size - draw) / 2);
  const top = draw > size ? 0 : Math.round((size - draw) / 2);

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

  // No dark outer shadow — that made the mark look recessed / sunk in
  await sharp({
    create: { width: size, height: size, channels: 4, background: SKY },
  })
    .composite([{ input: emblemBuf, left: 0, top: 0 }])
    .png()
    .toFile(file);
}

// Home-screen — sun circle fills the tile (corners of square stay sky blue)
await emblemOnSky(192, path.join(out, "icon-192.png"), 1.22);
await emblemOnSky(512, path.join(out, "icon-512.png"), 1.22);
await emblemOnSky(180, path.join(out, "apple-touch-icon.png"), 1.22);
await emblemOnSky(512, path.join("public", "icon-512.png"), 1.22);

// Android maskable — slightly smaller for adaptive safe zone
await emblemOnSky(192, path.join(out, "maskable-192.png"), 1.0);
await emblemOnSky(512, path.join(out, "maskable-512.png"), 1.0);

// Clean debug artifacts if present
for (const f of ["_debug-emblem.png", "_debug-fit.png", "_debug-large.png"]) {
  const p = path.join(out, f);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

console.log("PWA icons ready (sky blue + large emblem):", fs.readdirSync(out));
