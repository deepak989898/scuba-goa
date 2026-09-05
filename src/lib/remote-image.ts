/**
 * `next.config.ts` uses a custom loader (`/api/image`) so every well-formed
 * HTTP/HTTPS URL can be resized without Vercel `/_next/image` (402 on this project).
 */
export function isRemoteUrlOptimizableByNext(src: string): boolean {
  const t = src?.trim() ?? "";
  if (!t || t.startsWith("/")) return false;
  if (preferRawImageDelivery(t)) return false;
  try {
    const u = new URL(t);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Hosts that must bypass `/api/image` (optimizer blocks or returns errors).
 * Firebase/GCS are intentionally NOT listed — they are resized via `/api/image`.
 */
export function preferRawImageDelivery(src: string): boolean {
  const t = src?.trim() ?? "";
  if (!t) return false;
  try {
    const host = new URL(t).hostname.toLowerCase();
    // SVG/data URLs are not handled by the raster pipeline.
    if (t.startsWith("data:")) return true;
    if (host.includes("wikimedia.org")) return false;
    if (host.includes("wikipedia.org")) return false;
  } catch {
    return false;
  }
  return false;
}
