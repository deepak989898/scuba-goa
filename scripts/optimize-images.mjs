#!/usr/bin/env node
/**
 * Optimize the few raster assets in `public/` and `src/app/` (logos + favicons).
 *
 * - Re-encodes the brand PNGs (transparent + plain) into smaller PNG + WebP siblings.
 * - Re-encodes the app icons (`icon.png`, `apple-icon.png`) at the sizes Next.js
 *   actually requests, so they stop shipping a 264 KB photo for a 192/180 px tile.
 *
 * Run:  npm run optimize:images   (or: node scripts/optimize-images.mjs)
 *
 * Safe to run repeatedly; sharp will overwrite the same output paths.
 */
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

async function fileSize(p) {
  try {
    const s = await stat(p);
    return s.size;
  } catch {
    return 0;
  }
}

/**
 * Rebuild a single PNG with palette compression + matching WebP.
 * `width` clamps the largest side; `null` keeps the source size.
 */
async function compressPng({ from, to, width, paletteAlpha = false }) {
  const buf = await readFile(from);
  let pipeline = sharp(buf);
  if (width) {
    pipeline = pipeline.resize({ width, withoutEnlargement: true });
  }
  const before = buf.length;

  await pipeline
    .clone()
    .png({
      compressionLevel: 9,
      palette: true,
      quality: 80,
      effort: 10,
      colors: paletteAlpha ? 256 : 128,
    })
    .toFile(to);

  const webpPath = to.replace(/\.png$/i, ".webp");
  await sharp(buf)
    .resize({ width: width ?? undefined, withoutEnlargement: true })
    .webp({ quality: 80, effort: 6 })
    .toFile(webpPath);

  const afterPng = await fileSize(to);
  const afterWebp = await fileSize(webpPath);
  console.log(
    `• ${path.relative(ROOT, to)}\n    PNG  ${kb(before)} → ${kb(afterPng)}  ` +
      `(saved ${kb(Math.max(0, before - afterPng))})\n    WEBP ${kb(afterWebp)}`,
  );
}

const targets = [
  // Header logo (rendered at ~56 px tall, kept at 1000 px wide for 2x retina).
  {
    from: path.join(ROOT, "public", "book-scuba-goa-logo-transparent.png"),
    to: path.join(ROOT, "public", "book-scuba-goa-logo-transparent.png"),
    width: 1000,
    paletteAlpha: true,
  },
  // OG / share preview (uses 1024×683 in metadata).
  {
    from: path.join(ROOT, "public", "book-scuba-goa-logo.png"),
    to: path.join(ROOT, "public", "book-scuba-goa-logo.png"),
    width: 1200,
    paletteAlpha: false,
  },
  // App icon — Next.js serves this directly; 512 is plenty for PWA tiles.
  {
    from: path.join(ROOT, "src", "app", "icon.png"),
    to: path.join(ROOT, "src", "app", "icon.png"),
    width: 512,
    paletteAlpha: true,
  },
  // Apple touch icon — spec is 180×180.
  {
    from: path.join(ROOT, "src", "app", "apple-icon.png"),
    to: path.join(ROOT, "src", "app", "apple-icon.png"),
    width: 180,
    paletteAlpha: true,
  },
];

console.log("Optimizing brand & icon raster assets…");
for (const t of targets) {
  try {
    await compressPng(t);
  } catch (err) {
    console.error(`  ! Skipped ${t.from}:`, err.message);
  }
}
console.log("\nDone. Commit the smaller PNG/WebP outputs.");
