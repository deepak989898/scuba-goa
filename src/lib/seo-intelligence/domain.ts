import {
  SEO_INTEL_EXCLUDED_DOMAINS,
  SEO_INTEL_MARKETPLACE_DOMAINS,
} from "./collections";
import type { SeoIntelCompetitorType } from "./types";

/**
 * Normalise admin/SERP domain inputs to a canonical host.
 * example.com | https://example.com | www.example.com/page → example.com
 */
export function normaliseDomain(input: string): string | null {
  const raw = String(input ?? "").trim().toLowerCase();
  if (!raw) return null;

  let candidate = raw;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  try {
    const url = new URL(candidate);
    let host = url.hostname.toLowerCase().replace(/\.$/, "");
    if (host.startsWith("www.")) host = host.slice(4);
    if (!host || !host.includes(".")) return null;
    if (host === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return null;
    return host;
  } catch {
    return null;
  }
}

export function isOwnDomain(domain: string): boolean {
  const d = normaliseDomain(domain);
  if (!d) return false;
  return d === "bookscubagoa.com" || d.endsWith(".bookscubagoa.com");
}

export function isExcludedDomain(domain: string): boolean {
  const d = normaliseDomain(domain);
  if (!d) return true;
  if (isOwnDomain(d)) return true;
  return SEO_INTEL_EXCLUDED_DOMAINS.some(
    (ex) => d === ex || d.endsWith(`.${ex}`),
  );
}

export function isMarketplaceDomain(domain: string): boolean {
  const d = normaliseDomain(domain);
  if (!d) return false;
  return SEO_INTEL_MARKETPLACE_DOMAINS.some(
    (m) => d === m || d.endsWith(`.${m}`),
  );
}

export function inferCompetitorType(domain: string): SeoIntelCompetitorType {
  if (isMarketplaceDomain(domain)) return "marketplace";
  return "direct_local";
}

export function competitorDocId(canonicalDomain: string): string {
  return canonicalDomain.replace(/[^a-z0-9.-]+/g, "_");
}

export function normaliseKeyword(keyword: string): string {
  return String(keyword ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
