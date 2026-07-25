import { normalizeSiteUrl, siteOrigin } from "./normalize-url";

/** Only allow fetch/audit of configured public site hostnames. */
export function assertSafeAuditUrl(url: string): { ok: true; url: string } | { ok: false; error: string } {
  const normalized = normalizeSiteUrl(url);
  if (!normalized) {
    return { ok: false, error: "URL is not on the configured public site hostname" };
  }

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return { ok: false, error: "Invalid URL" };
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, error: "Only http(s) URLs allowed" };
  }

  const host = parsed.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host === "metadata.google.internal" ||
    host === "metadata"
  ) {
    return { ok: false, error: "Blocked host" };
  }

  // Block literal private IPs
  if (
    /^(127\.|10\.|192\.168\.|169\.254\.|0\.|::1$|fc00:|fe80:)/i.test(host)
  ) {
    return { ok: false, error: "Private or link-local address blocked" };
  }

  const siteHost = new URL(siteOrigin()).hostname.toLowerCase();
  if (host !== siteHost && host !== `www.${siteHost.replace(/^www\./, "")}`) {
    const bare = siteHost.replace(/^www\./, "");
    if (host !== bare && host !== `www.${bare}`) {
      return { ok: false, error: "Cross-site URL rejected" };
    }
  }

  return { ok: true, url: normalized };
}
