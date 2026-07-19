#!/usr/bin/env node
/**
 * Safe local image optimizer (Sharp).
 *
 * - Scans allowlisted folders only
 * - Converts suitable JPG/JPEG/PNG → WebP (siblings; originals kept)
 * - Skips SVG, ICO, GIF, existing WebP/AVIF (unless --reencode-webp)
 * - Never touches node_modules, .next, .git, credentials
 *
 * Usage:
 *   node scripts/optimize-images.mjs --dry-run
 *   node scripts/optimize-images.mjs
 *   node scripts/optimize-images.mjs --legacy-brand   # re-compress brand PNG+WebP in place (old behavior)
 *
 * npm:
 *   npm run images:optimize:dry-run
 *   npm run images:optimize
 *   npm run images:audit
 */
import { createHash } from "node:crypto";
import {
  access,
  mkdir,
  readdir,
  readFile,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const DEFAULT_ALLOWLIST = ["public", "src/app"];

const SKIP_DIR_NAMES = new Set([
  "node_modules",
  ".next",
  ".git",
  ".vercel",
  "dist",
  "build",
  "coverage",
  ".turbo",
  "cache",
  ".cache",
]);

/** Tiny UI / text / brand tiles — keep PNG, do not invent WebP siblings that replace them. */
const SKIP_BASENAMES = new Set([
  "favicon.ico",
  "blog-bar-host.png",
  "blog-watermark-tile.png",
]);

const CONVERT_EXT = new Set([".jpg", ".jpeg", ".png"]);
const REPORT_EXT = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".avif",
  ".gif",
  ".svg",
  ".ico",
]);

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run") || args.has("-n");
const AUDIT_ONLY = args.has("--audit");
const LEGACY_BRAND = args.has("--legacy-brand");
const FORCE = args.has("--force"); // overwrite existing .webp sibling

function kb(n) {
  return `${(n / 1024).toFixed(1)} KB`;
}

function pctSaved(before, after) {
  if (before <= 0) return "0%";
  return `${(((before - after) / before) * 100).toFixed(1)}%`;
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir, out) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (SKIP_DIR_NAMES.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      await walk(full, out);
    } else if (e.isFile()) {
      const ext = path.extname(e.name).toLowerCase();
      if (REPORT_EXT.has(ext)) out.push(full);
    }
  }
}

function shouldSkipConvert(filePath) {
  const base = path.basename(filePath);
  if (SKIP_BASENAMES.has(base)) return "deny-list (text/favicon/tile)";
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".svg") return "svg";
  if (ext === ".ico") return "favicon/ico";
  if (ext === ".gif") return "gif (may be animated)";
  if (ext === ".webp" || ext === ".avif") return "already modern format";
  if (!CONVERT_EXT.has(ext)) return `unsupported ext ${ext}`;
  return null;
}

/**
 * Photographic WebP ~82; preserve alpha for PNG with transparency.
 * Cap longest side only when clearly oversized for web (>2400).
 */
async function convertToWebp(srcPath, destPath, { dryRun }) {
  const buf = await readFile(srcPath);
  const meta = await sharp(buf, { failOn: "none" }).metadata();
  const hasAlpha = Boolean(meta.hasAlpha);
  const maxSide = Math.max(meta.width ?? 0, meta.height ?? 0);
  const resizeTo = maxSide > 2400 ? 1920 : undefined;

  let pipeline = sharp(buf, { failOn: "none" }).rotate();
  if (resizeTo) {
    pipeline = pipeline.resize({
      width: resizeTo,
      height: resizeTo,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  const quality = hasAlpha ? 85 : 82;
  const outBuf = await pipeline
    .webp({ quality, alphaQuality: hasAlpha ? 90 : undefined, effort: 6 })
    .toBuffer();

  if (!dryRun) {
    await mkdir(path.dirname(destPath), { recursive: true });
    await writeFile(destPath, outBuf);
  }

  return {
    beforeBytes: buf.length,
    afterBytes: outBuf.length,
    width: meta.width ?? 0,
    height: meta.height ?? 0,
    hasAlpha,
    quality,
    resized: Boolean(resizeTo),
  };
}

/** Legacy in-place brand PNG compression + WebP sibling (previous script behavior). */
async function legacyBrandPass({ dryRun }) {
  const targets = [
    {
      from: path.join(ROOT, "public", "book-scuba-goa-logo-transparent.png"),
      width: 1000,
      paletteAlpha: true,
    },
    {
      from: path.join(ROOT, "public", "book-scuba-goa-logo.png"),
      width: 1200,
      paletteAlpha: false,
    },
    {
      from: path.join(ROOT, "src", "app", "icon.png"),
      width: 512,
      paletteAlpha: true,
    },
    {
      from: path.join(ROOT, "src", "app", "apple-icon.png"),
      width: 180,
      paletteAlpha: true,
    },
  ];

  const results = [];
  for (const t of targets) {
    if (!(await exists(t.from))) {
      results.push({ path: t.from, status: "missing" });
      continue;
    }
    const buf = await readFile(t.from);
    const before = buf.length;
    let pipeline = sharp(buf).resize({
      width: t.width,
      withoutEnlargement: true,
    });
    const pngBuf = await pipeline
      .clone()
      .png({
        compressionLevel: 9,
        palette: true,
        quality: 80,
        effort: 10,
        colors: t.paletteAlpha ? 256 : 128,
      })
      .toBuffer();
    const webpPath = t.from.replace(/\.png$/i, ".webp");
    const webpBuf = await sharp(buf)
      .resize({ width: t.width, withoutEnlargement: true })
      .webp({ quality: 80, effort: 6 })
      .toBuffer();

    if (!dryRun) {
      await writeFile(t.from, pngBuf);
      await writeFile(webpPath, webpBuf);
    }
    results.push({
      path: path.relative(ROOT, t.from),
      status: dryRun ? "dry-run" : "written",
      beforeBytes: before,
      afterPng: pngBuf.length,
      afterWebp: webpBuf.length,
    });
  }
  return results;
}

async function main() {
  const allowlist = DEFAULT_ALLOWLIST.map((d) => path.join(ROOT, d));
  const allFiles = [];
  for (const dir of allowlist) {
    if (await exists(dir)) await walk(dir, allFiles);
  }

  const inventory = [];
  for (const f of allFiles) {
    const st = await stat(f);
    let width = 0;
    let height = 0;
    let hasAlpha = false;
    try {
      const m = await sharp(f, { failOn: "none" }).metadata();
      width = m.width ?? 0;
      height = m.height ?? 0;
      hasAlpha = Boolean(m.hasAlpha);
    } catch {
      /* binary ico etc */
    }
    inventory.push({
      path: path.relative(ROOT, f).replace(/\\/g, "/"),
      bytes: st.size,
      ext: path.extname(f).toLowerCase(),
      width,
      height,
      hasAlpha,
    });
  }
  inventory.sort((a, b) => b.bytes - a.bytes);

  const totalBytes = inventory.reduce((s, r) => s + r.bytes, 0);
  console.log("=== Image audit (allowlist: public, src/app) ===");
  console.log(`Files: ${inventory.length} | Total: ${kb(totalBytes)}`);
  console.log(
    `>300KB: ${inventory.filter((i) => i.bytes > 300 * 1024).length} | >1000KB: ${inventory.filter((i) => i.bytes > 1000 * 1024).length}`,
  );
  for (const row of inventory) {
    console.log(
      `  ${kb(row.bytes).padStart(10)}  ${row.width}x${row.height}  ${row.path}`,
    );
  }

  if (AUDIT_ONLY) {
    const reportPath = path.join(ROOT, "scripts", "image-audit-report.json");
    if (!DRY_RUN) {
      await writeFile(
        reportPath,
        JSON.stringify({ generatedAt: new Date().toISOString(), inventory }, null, 2),
      );
      console.log(`\nWrote ${path.relative(ROOT, reportPath)}`);
    }
    return;
  }

  if (LEGACY_BRAND) {
    console.log(`\n=== Legacy brand pass ${DRY_RUN ? "(dry-run)" : ""} ===`);
    const legacy = await legacyBrandPass({ dryRun: DRY_RUN });
    console.log(JSON.stringify(legacy, null, 2));
  }

  console.log(`\n=== WebP conversion ${DRY_RUN ? "(dry-run)" : ""} ===`);
  const converted = [];
  const skipped = [];

  for (const f of allFiles) {
    const skipReason = shouldSkipConvert(f);
    if (skipReason) {
      skipped.push({ path: path.relative(ROOT, f), reason: skipReason });
      continue;
    }

    const dest = f.replace(/\.(jpe?g|png)$/i, ".webp");
    if ((await exists(dest)) && !FORCE) {
      const srcStat = await stat(f);
      const destStat = await stat(dest);
      skipped.push({
        path: path.relative(ROOT, f),
        reason: `webp sibling exists (${kb(destStat.size)}; source ${kb(srcStat.size)}) — use --force to overwrite`,
      });
      continue;
    }

    try {
      const result = await convertToWebp(f, dest, { dryRun: DRY_RUN });
      const entry = {
        from: path.relative(ROOT, f).replace(/\\/g, "/"),
        to: path.relative(ROOT, dest).replace(/\\/g, "/"),
        ...result,
        saved: result.beforeBytes - result.afterBytes,
        savedPct: pctSaved(result.beforeBytes, result.afterBytes),
        status: DRY_RUN ? "dry-run" : "written",
      };
      converted.push(entry);
      console.log(
        `• ${entry.from} → ${entry.to}\n    ${kb(entry.beforeBytes)} → ${kb(entry.afterBytes)}  saved ${kb(entry.saved)} (${entry.savedPct})${entry.resized ? " [resized]" : ""}`,
      );
    } catch (err) {
      skipped.push({
        path: path.relative(ROOT, f),
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const beforeSum = converted.reduce((s, c) => s + c.beforeBytes, 0);
  const afterSum = converted.reduce((s, c) => s + c.afterBytes, 0);

  const report = {
    generatedAt: new Date().toISOString(),
    dryRun: DRY_RUN,
    allowlist: DEFAULT_ALLOWLIST,
    inventoryCount: inventory.length,
    inventoryBytes: totalBytes,
    converted,
    skipped,
    totals: {
      converted: converted.length,
      skipped: skipped.length,
      beforeBytes: beforeSum,
      afterBytes: afterSum,
      savedBytes: beforeSum - afterSum,
      savedPct: pctSaved(beforeSum, afterSum),
    },
    fingerprint: createHash("sha1")
      .update(converted.map((c) => c.from).join("|"))
      .digest("hex")
      .slice(0, 12),
  };

  const reportPath = path.join(ROOT, "scripts", "image-optimize-report.json");
  await writeFile(reportPath, JSON.stringify(report, null, 2));

  console.log("\n=== Summary ===");
  console.log(`Converted: ${report.totals.converted} | Skipped: ${report.totals.skipped}`);
  console.log(
    `Bytes (candidates): ${kb(beforeSum)} → ${kb(afterSum)}  saved ${kb(beforeSum - afterSum)} (${report.totals.savedPct})`,
  );
  console.log(`Report: ${path.relative(ROOT, reportPath)}`);
  if (DRY_RUN) {
    console.log("Dry-run only — no files written. Re-run without --dry-run to apply.");
  } else {
    console.log("Originals kept. Update references, verify, then delete unused sources.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
