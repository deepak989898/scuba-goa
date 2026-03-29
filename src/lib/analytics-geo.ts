/**
 * Geo hints from edge / hosting (no extra API). Vercel & Cloudflare pass country;
 * city/region available on Vercel when enabled.
 */
export function geoFromRequestHeaders(headers: Headers): {
  geoCountry?: string;
  geoCity?: string;
  geoRegion?: string;
} {
  const decode = (v: string | null): string | undefined => {
    if (!v || !v.trim()) return undefined;
    try {
      return decodeURIComponent(v.replace(/\+/g, " ")).trim();
    } catch {
      return v.trim();
    }
  };

  const country =
    decode(headers.get("x-vercel-ip-country")) ??
    decode(headers.get("cf-ipcountry"));
  const city = decode(headers.get("x-vercel-ip-city"));
  const region = decode(headers.get("x-vercel-ip-country-region"));

  return {
    geoCountry: country?.slice(0, 64) || undefined,
    geoCity: city?.slice(0, 128) || undefined,
    geoRegion: region?.slice(0, 64) || undefined,
  };
}
