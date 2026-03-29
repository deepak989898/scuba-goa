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
