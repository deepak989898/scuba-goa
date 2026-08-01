import type {
  SeoIntelContentType,
  SeoIntelSearchIntent,
} from "./types";

export function classifySeoIntelIntent(keyword: string): SeoIntelSearchIntent {
  const l = keyword.toLowerCase();
  if (
    /\b(book|booking|buy|reserve|ticket|tickets|online booking)\b/.test(l)
  ) {
    return "transactional";
  }
  if (
    /\b(price|cost|charges|fee|how much|cheap|package|packages|deal|offer)\b/.test(
      l,
    )
  ) {
    return "commercial";
  }
  if (
    /\b(near me|baga|calangute|candolim|panjim|panaji|anjuna|morjim|palolem|north goa|south goa|in goa)\b/.test(
      l,
    )
  ) {
    return "local";
  }
  if (/\b(book scuba goa|bookscubagoa|login|official site)\b/.test(l)) {
    return "navigational";
  }
  return "informational";
}

export function recommendContentType(
  keyword: string,
  intent: SeoIntelSearchIntent,
): SeoIntelContentType {
  const l = keyword.toLowerCase();
  if (intent === "transactional" || /\b(book|booking)\b/.test(l)) {
    return "service_page";
  }
  if (/\b(package|packages|combo|tour package)\b/.test(l)) {
    return "package_page";
  }
  if (/\b(vs|versus|compare|comparison)\b/.test(l)) {
    return "comparison_page";
  }
  if (
    /\b(faq|how to|what is|is .+ safe|age limit|timing)\b/.test(l) ||
    intent === "informational"
  ) {
    if (/\b(guide|itinerary|spots|places)\b/.test(l)) return "guide";
    if (intent === "informational") return "blog";
  }
  if (
    /\b(baga|calangute|candolim|north goa|south goa|grand island|grande island)\b/.test(
      l,
    )
  ) {
    return "location_landing";
  }
  if (intent === "commercial") return "service_page";
  return "blog";
}

export function inferCategory(keyword: string): string {
  const l = keyword.toLowerCase();
  const rules: [RegExp, string][] = [
    [/scuba|diving/, "Scuba Diving"],
    [/snorkel/, "Snorkelling"],
    [/bungee/, "Bungee Jumping"],
    [/flyboard/, "Flyboarding"],
    [/parasail/, "Parasailing"],
    [/jet\s*ski|jetski/, "Jet Skiing"],
    [/banana\s*boat/, "Banana Boat"],
    [/bumper/, "Bumper Ride"],
    [/dolphin/, "Dolphin Trip"],
    [/grand(e)?\s*island/, "Grand Island"],
    [/casino/, "Casino"],
    [/russian\s*night|night\s*club|disco|pub/, "Nightlife"],
    [/boat\s*party|cruise\s*party/, "Boat / Cruise Party"],
    [/dudhsagar/, "Dudhsagar"],
    [/north\s*goa/, "North Goa Tour"],
    [/south\s*goa/, "South Goa Tour"],
    [/water\s*sport/, "Water Sports"],
    [/tour\s*package|goa\s*tour/, "Tour Packages"],
  ];
  for (const [re, cat] of rules) {
    if (re.test(l)) return cat;
  }
  return "General";
}

export function inferLocation(keyword: string): string {
  const l = keyword.toLowerCase();
  const locs = [
    "Baga",
    "Calangute",
    "Candolim",
    "Panjim",
    "Anjuna",
    "Morjim",
    "Palolem",
    "North Goa",
    "South Goa",
    "Grande Island",
    "Grand Island",
    "Dudhsagar",
    "Goa",
  ];
  for (const loc of locs) {
    if (l.includes(loc.toLowerCase())) return loc;
  }
  return "Goa";
}
