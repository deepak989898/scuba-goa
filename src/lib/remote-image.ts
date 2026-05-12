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
  try {
    const u = new URL(t);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}
