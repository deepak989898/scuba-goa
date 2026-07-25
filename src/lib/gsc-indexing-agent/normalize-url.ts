import { SITE_URL } from "@/lib/constants";

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "msclkid",
  "mc_cid",
  "mc_eid",
  "_ga",
  "ref",
]);

export function siteOrigin(): string {
  return SITE_URL.replace(/\/$/, "");
}

export function siteId(): string {
  try {
    return new URL(siteOrigin()).hostname.replace(/^www\./, "");
  } catch {
    return "bookscubagoa.com";
  }
}

/** Normalize public site URLs for inventory dedupe. */
export function normalizeSiteUrl(input: string): string | null {
  const raw = String(input || "").trim();
  if (!raw) return null;
  let u: URL;
  try {
    u = new URL(raw.startsWith("http") ? raw : `${siteOrigin()}${raw.startsWith("/") ? "" : "/"}${raw}`);
  } catch {
    return null;
  }

  const origin = siteOrigin();
  let host = u.hostname.toLowerCase().replace(/^www\./, "");
  const siteHost = new URL(origin).hostname.toLowerCase().replace(/^www\./, "");
  if (host !== siteHost) return null;

  u.protocol = "https:";
  u.hostname = new URL(origin).hostname; // keep configured host (www or not)
  u.hash = "";

  const kept = new URLSearchParams();
  u.searchParams.forEach((v, k) => {
    if (!TRACKING_PARAMS.has(k.toLowerCase())) kept.set(k, v);
  });
  u.search = kept.toString() ? `?${kept.toString()}` : "";

  let path = u.pathname.replace(/\/+/g, "/");
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  u.pathname = path || "/";

  return u.toString();
}

export function urlIdFromNormalized(normalizedUrl: string): string {
  return Buffer.from(normalizedUrl)
    .toString("base64url")
    .replace(/=+$/, "")
    .slice(0, 120);
}

export function isExcludedPath(pathname: string): boolean {
  const p = pathname.toLowerCase();
  if (p.startsWith("/admin")) return true;
  if (p.startsWith("/api")) return true;
  if (p.startsWith("/login")) return true;
  if (p.includes("/preview")) return true;
  if (p.includes("/draft")) return true;
  return false;
}
