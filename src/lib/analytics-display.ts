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
  if (!ms || ms <= 0) return "—";
  const totalSec = Math.round(ms / 1000);
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
  geoCountry?: string;
}): string {
  const { geoCity, geoRegion, geoCountry } = parts;
  const bits: string[] = [];
  if (geoCity) bits.push(geoCity);
  if (geoRegion && geoRegion !== geoCity) bits.push(geoRegion);
  if (geoCountry) bits.push(geoCountry);
  return bits.length ? bits.join(", ") : "";
}
