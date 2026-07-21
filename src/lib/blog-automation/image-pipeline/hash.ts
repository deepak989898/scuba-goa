import { createHash } from "crypto";
import sharp from "sharp";

export function sha256Hex(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

export function promptHash(prompt: string): string {
  return createHash("sha256").update(prompt.trim().toLowerCase()).digest("hex");
}

/**
 * 16×16 average hash → 64-bit hex (perceptual).
 */
export async function averageHash(image: Buffer): Promise<string> {
  const raw = await sharp(image)
    .rotate()
    .greyscale()
    .resize(16, 16, { fit: "fill" })
    .raw()
    .toBuffer();
  let sum = 0;
  for (let i = 0; i < raw.length; i++) sum += raw[i]!;
  const avg = sum / raw.length;
  let bits = "";
  for (let i = 0; i < raw.length; i++) {
    bits += raw[i]! >= avg ? "1" : "0";
  }
  // 256 bits → hex
  let hex = "";
  for (let i = 0; i < bits.length; i += 4) {
    hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  }
  return hex;
}

/**
 * Difference hash 16×17 greyscale → 256-bit hex.
 */
export async function differenceHash(image: Buffer): Promise<string> {
  const raw = await sharp(image)
    .rotate()
    .greyscale()
    .resize(17, 16, { fit: "fill" })
    .raw()
    .toBuffer();
  let bits = "";
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const left = raw[y * 17 + x]!;
      const right = raw[y * 17 + x + 1]!;
      bits += left < right ? "1" : "0";
    }
  }
  let hex = "";
  for (let i = 0; i < bits.length; i += 4) {
    hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  }
  return hex;
}

/** Hamming distance between equal-length hex hashes. */
export function hammingHex(a: string, b: string): number {
  if (!a || !b || a.length !== b.length) return 999;
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    const x = parseInt(a[i]!, 16) ^ parseInt(b[i]!, 16);
    dist += [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4][x] ?? 4;
  }
  return dist;
}

/** Similarity 0–100 from hamming (0 distance = 100). Max bits ≈ hexLen*4. */
export function similarityFromHamming(dist: number, hexLen: number): number {
  const max = Math.max(1, hexLen * 4);
  return Math.max(0, Math.round((1 - dist / max) * 100));
}
