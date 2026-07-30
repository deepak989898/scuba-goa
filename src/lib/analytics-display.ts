import { SITE_NAME } from "@/lib/constants";

/** Strip repeated site branding from document.title for admin readability */
export function shortenPageLabel(pageLabel: string): string {
  let s = pageLabel.trim();
  if (!s) return "";
  const patterns = [
    new RegExp(`\\s*\\|\\s*${escapeRe(SITE_NAME)}.*$`, "i"),
    /\s*\|\s*Scuba Diving.*Goa Tour Packages.*$/i,
    /\s*\|\s*Book Scuba Goa.*$/i,
  ];
  for (const re of patterns) s = s.replace(re, "");
  s = s.trim();
  return s || pageLabel.trim();
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function formatDurationMs(ms: number | null): string {
  if (ms == null || ms < 0) return "—";
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const sec = totalSec % 60;
  const totalMin = Math.floor(totalSec / 60);
  const min = totalMin % 60;
  const hr = Math.floor(totalMin / 60);
  if (hr > 0) return `${hr}h ${min}m ${sec}s`;
  if (min > 0) return `${min}m ${sec}s`;
  return `${sec}s`;
}

export function formatGeoLine(parts: {
  geoCity?: string;
  geoRegion?: string;
  geoRegionName?: string;
  geoCountry?: string;
  geoCountryName?: string;
}): string {
  const city = parts.geoCity?.trim();
  const region =
    parts.geoRegionName?.trim() ||
    parts.geoRegion?.trim();
  const country =
    parts.geoCountryName?.trim() ||
    parts.geoCountry?.trim();
  const bits: string[] = [];
  if (city) bits.push(city);
  if (region && region !== city) bits.push(region);
  if (country && country !== region && country !== city) bits.push(country);
  return bits.length ? bits.join(", ") : "";
}
