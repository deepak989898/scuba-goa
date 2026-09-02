import type { SeoBlogDraft, SeoBlogKeyword } from "@/lib/seo-blog-center/types";

export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function computeSeoScore(input: {
  searchVolume: number;
  competition: "low" | "medium" | "high";
  trendScore: number;
  gscImpressions?: number;
  gscPosition?: number;
}): number {
  const comp =
    input.competition === "low" ? 1 : input.competition === "medium" ? 0.65 : 0.35;
  const vol = Math.min(100, (input.searchVolume / 10000) * 100);
  const trend = Math.min(100, input.trendScore);
  const gscBoost = input.gscImpressions
    ? Math.min(25, Math.log10(input.gscImpressions + 1) * 8)
    : 0;
  const posBoost =
    input.gscPosition && input.gscPosition > 10
      ? Math.min(15, (input.gscPosition - 10) * 0.5)
      : 0;
  return Math.round(vol * 0.35 + trend * 0.25 + comp * 30 + gscBoost + posBoost);
}

export function keywordHasDraft(
  keyword: SeoBlogKeyword,
  drafts: SeoBlogDraft[],
): boolean {
  const k = keyword.keyword.toLowerCase().trim();
  return drafts.some(
    (d) =>
      d.keywordId === keyword.id ||
      d.keyword.toLowerCase().trim() === k ||
      d.title.toLowerCase().includes(k),
  );
}

export function inferServiceSlug(keyword: string): string {
  const l = keyword.toLowerCase();
  if (/casino|poker|blackjack|roulette/.test(l)) return "casino-bookings";
  if (/night.?club|disco|pub crawl|vip table/.test(l)) return "night-club";
  if (/parasail|jet.?ski|banana boat|flyboard|bungee|water sport/.test(l)) {
    return "water-sports";
  }
  if (/north goa|south goa|fort|beach tour|sightseeing/.test(l)) {
    return "north-goa-tour";
  }
  if (/dolphin/.test(l)) return "dolphin-trip";
  if (/dudhsagar/.test(l)) return "dudhsagar-trip";
  if (/disco/.test(l)) return "disco";
  if (/\bpub\b/.test(l)) return "pubs";
  if (/\b(scuba|diving|snorkel|padi|grande island)\b/.test(l)) {
    return "scuba-diving";
  }
  return "scuba-diving";
}

export function inferCategory(keyword: string): import("@/lib/seo-blog-center/types").KeywordCategory {
  const l = keyword.toLowerCase();
  if (/\b(scuba|diving|underwater|snorkel|padi)\b/.test(l)) return "scuba_diving";
  if (/\b(parasail|jet ski|banana boat|flyboard|bungee|watersport)\b/.test(l)) {
    return "water_sports";
  }
  if (/\b(casino|poker|blackjack|roulette|chips)\b/.test(l)) return "travel_guides";
  if (/\b(night.?club|disco|pub crawl|vip table|guest list)\b/.test(l)) {
    return "travel_guides";
  }
  if (/\b(baga|calangute|anjuna|palolem|beach|north goa|south goa)\b/.test(l)) {
    return "goa_beaches";
  }
  if (/\b(grande island|island trip|boat)\b/.test(l)) return "island_trips";
  if (/\b(price|cost|booking|package|book)\b/.test(l)) return "booking_pricing";
  if (/\bfrom\b/.test(l) && !l.includes("goa")) return "city_origin";
  if (/\b(best time|guide|itinerary|tips|safety)\b/.test(l)) return "travel_guides";
  return "travel_guides";
}
