import { SITE_URL } from "@/lib/constants";

/** Absolute URL for og:image / Twitter cards (crawlers require absolute URLs). */
export function absoluteOgImageUrl(image: string | undefined | null): string {
  const base = SITE_URL.replace(/\/$/, "");
  const t = (image ?? "").trim();
  if (!t) return `${base}/book-scuba-goa-logo.png`;
  if (/^https?:\/\//i.test(t)) return t;
  return t.startsWith("/") ? `${base}${t}` : `${base}/${t}`;
}
