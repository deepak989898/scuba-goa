/**
 * Geo from edge headers (Vercel / Cloudflare) + optional IP lookup fallback.
 * Stores human-readable country/region when possible (Clarity-style).
 */

export type AnalyticsGeo = {
  geoCountry?: string;
  geoCountryName?: string;
  geoCity?: string;
  geoRegion?: string;
  geoRegionName?: string;
  geoTimezone?: string;
};

function decodeHeader(v: string | null): string | undefined {
  if (!v || !v.trim()) return undefined;
  try {
    return decodeURIComponent(v.replace(/\+/g, " ")).trim();
  } catch {
    return v.trim();
  }
}

function countryNameFromCode(code: string): string | undefined {
  try {
    const name = new Intl.DisplayNames(["en"], { type: "region" }).of(
      code.toUpperCase(),
    );
    return name && name !== code ? name : undefined;
  } catch {
    return undefined;
  }
}

/** Common IN region codes → display names (Vercel sends ISO 3166-2 subdivision). */
const IN_REGION_NAMES: Record<string, string> = {
  AN: "Andaman and Nicobar",
  AP: "Andhra Pradesh",
  AR: "Arunachal Pradesh",
  AS: "Assam",
  BR: "Bihar",
  CH: "Chandigarh",
  CT: "Chhattisgarh",
  DL: "Delhi",
  GA: "Goa",
  GJ: "Gujarat",
  HR: "Haryana",
  HP: "Himachal Pradesh",
  JK: "Jammu and Kashmir",
  JH: "Jharkhand",
  KA: "Karnataka",
  KL: "Kerala",
  LA: "Ladakh",
  LD: "Lakshadweep",
  MP: "Madhya Pradesh",
  MH: "Maharashtra",
  MN: "Manipur",
  ML: "Meghalaya",
  MZ: "Mizoram",
  NL: "Nagaland",
  OR: "Odisha",
  PY: "Puducherry",
  PB: "Punjab",
  RJ: "Rajasthan",
  SK: "Sikkim",
  TN: "Tamil Nadu",
  TG: "Telangana",
  TR: "Tripura",
  UP: "Uttar Pradesh",
  UT: "Uttarakhand",
  WB: "West Bengal",
};

function regionDisplayName(country: string | undefined, region: string | undefined): string | undefined {
  if (!region) return undefined;
  if (country?.toUpperCase() === "IN") {
    return IN_REGION_NAMES[region.toUpperCase()] ?? region;
  }
  return region;
}

export function geoFromRequestHeaders(headers: Headers): AnalyticsGeo {
  const country =
    decodeHeader(headers.get("x-vercel-ip-country")) ??
    decodeHeader(headers.get("cf-ipcountry"));
  const city =
    decodeHeader(headers.get("x-vercel-ip-city")) ??
    decodeHeader(headers.get("x-vercel-ip-city-latlong")?.split(",")[0] ?? null);
  const region = decodeHeader(headers.get("x-vercel-ip-country-region"));
  const timezone = decodeHeader(headers.get("x-vercel-ip-timezone"));

  const geoCountry = country?.slice(0, 8)?.toUpperCase() || undefined;
  const geoRegion = region?.slice(0, 64) || undefined;

  return {
    geoCountry,
    geoCountryName: geoCountry
      ? countryNameFromCode(geoCountry)?.slice(0, 80)
      : undefined,
    geoCity: city?.slice(0, 128) || undefined,
    geoRegion,
    geoRegionName: regionDisplayName(geoCountry, geoRegion)?.slice(0, 80),
    geoTimezone: timezone?.slice(0, 64) || undefined,
  };
}

function isPrivateOrLocalIp(ip: string): boolean {
  if (!ip) return true;
  if (ip === "::1" || ip.startsWith("127.") || ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.") || ip.startsWith("169.254.")) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true;
  return false;
}

const ipGeoCache = new Map<string, { at: number; geo: AnalyticsGeo }>();
const IP_GEO_TTL_MS = 1000 * 60 * 60 * 6;

/**
 * Fallback when edge geo headers are empty (still on Vercel, but rare).
 * Uses ipapi.co — skip private/local IPs.
 */
export async function geoFromIpFallback(ip: string): Promise<AnalyticsGeo> {
  if (isPrivateOrLocalIp(ip)) return {};
  const cached = ipGeoCache.get(ip);
  if (cached && Date.now() - cached.at < IP_GEO_TTL_MS) return cached.geo;

  try {
    const ctrl = AbortSignal.timeout(1800);
    const res = await fetch(
      `https://ipapi.co/${encodeURIComponent(ip)}/json/`,
      { signal: ctrl, headers: { Accept: "application/json" } },
    );
    if (!res.ok) return {};
    const data = (await res.json()) as Record<string, unknown>;
    if (data.error) return {};
    const code = String(data.country_code ?? "").trim().toUpperCase();
    const city = String(data.city ?? "").trim();
    const region = String(data.region ?? data.region_code ?? "").trim();
    const geo: AnalyticsGeo = {
      geoCountry: code || undefined,
      geoCountryName:
        String(data.country_name ?? "").trim() ||
        (code ? countryNameFromCode(code) : undefined),
      geoCity: city || undefined,
      geoRegion: String(data.region_code ?? "").trim() || undefined,
      geoRegionName: region || undefined,
      geoTimezone: String(data.timezone ?? "").trim() || undefined,
    };
    ipGeoCache.set(ip, { at: Date.now(), geo });
    return geo;
  } catch {
    return {};
  }
}

export function mergeGeo(
  primary: AnalyticsGeo,
  fallback: AnalyticsGeo,
): AnalyticsGeo {
  return {
    geoCountry: primary.geoCountry || fallback.geoCountry,
    geoCountryName: primary.geoCountryName || fallback.geoCountryName,
    geoCity: primary.geoCity || fallback.geoCity,
    geoRegion: primary.geoRegion || fallback.geoRegion,
    geoRegionName: primary.geoRegionName || fallback.geoRegionName,
    geoTimezone: primary.geoTimezone || fallback.geoTimezone,
  };
}

export function geoHasLocation(g: AnalyticsGeo): boolean {
  return Boolean(g.geoCity || g.geoRegionName || g.geoRegion || g.geoCountry);
}

/** Resolve best geo: headers first, then IP API if needed. */
export async function resolveRequestGeo(
  headers: Headers,
  ip: string,
): Promise<AnalyticsGeo> {
  const fromHeaders = geoFromRequestHeaders(headers);
  if (geoHasLocation(fromHeaders) && fromHeaders.geoCity) {
    return fromHeaders;
  }
  if (geoHasLocation(fromHeaders) && fromHeaders.geoCountry) {
    // Have country but maybe missing city — try IP for richer detail
    const fromIp = await geoFromIpFallback(ip);
    return mergeGeo(fromHeaders, fromIp);
  }
  return mergeGeo(fromHeaders, await geoFromIpFallback(ip));
}
