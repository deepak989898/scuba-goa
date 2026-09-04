/**
 * `next.config.ts` enables `remotePatterns: [{ protocol: "https", hostname: "**" }]`,
 * so every well-formed HTTP/HTTPS URL is safe to pass through next/image. The
 * Vercel image optimizer takes care of size limits, content sniffing, and
 * caching the AVIF/WebP variants.
 *
 * We still reject obviously malformed strings (so we don't blow up downstream
 * with a `new URL()` crash inside the component render).
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

/** Wikimedia and some CDNs block or break the Vercel image optimizer — use native img. */
export function preferRawImageDelivery(src: string): boolean {
  const t = src?.trim() ?? "";
  if (!t) return false;
  try {
    const host = new URL(t).hostname.toLowerCase();
    if (host.includes("wikimedia.org")) return true;
    if (host.includes("wikipedia.org")) return true;
    if (host.includes("pexels.com")) return true;
    if (host.includes("pixabay.com")) return true;
    if (host.includes("images.unsplash.com")) return true;
    if (host.includes("firebasestorage.googleapis.com")) return true;
    if (host.endsWith(".storage.googleapis.com")) return true;
    if (host === "storage.googleapis.com") return true;
  } catch {
    return false;
  }
  return false;
}
