import { SITE_URL } from "@/lib/constants";

/**
 * Open Graph / Twitter require absolute image URLs. Accepts same-origin paths
 * (`/foo.jpg`) or full HTTPS URLs (Firestore, Unsplash, etc.).
 */
export function absoluteOgImageUrl(src: string): string {
  const t = src.trim();
  if (!t) return "";
  if (t.startsWith("https://") || t.startsWith("http://")) return t;
  const base = SITE_URL.replace(/\/$/, "");
  return t.startsWith("/") ? `${base}${t}` : `${base}/${t}`;
}
