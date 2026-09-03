/** Goa-only destination enforcement for TripJack hotels module. */

export const GOA_DISPLAY_NAME = "Goa, India";

export const GOA_ALIASES = new Set(
  [
    "goa",
    "india",
    "panaji",
    "panjim",
    "calangute",
    "candolim",
    "baga",
    "anjuna",
    "mapusa",
    "vasco",
    "vasco da gama",
    "margao",
    "madgaon",
    "north goa",
    "south goa",
    "goa india",
    "goa, india",
  ].map((s) => s.toLowerCase()),
);

export function isGoaPlaceName(input: string): boolean {
  const n = input.trim().toLowerCase();
  if (!n) return false;
  if (GOA_ALIASES.has(n)) return true;
  return n.includes("goa");
}

export function assertGoaOnly(place?: string): void {
  if (place && !isGoaPlaceName(place)) {
    throw new Error("Only hotels in Goa, India are available on this site.");
  }
}

export function normalizeGoaCityKey(city?: string): string {
  const c = (city ?? "goa").trim().toLowerCase();
  if (isGoaPlaceName(c)) return "goa";
  return "goa";
}
