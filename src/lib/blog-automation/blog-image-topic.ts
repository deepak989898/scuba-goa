import { buildPexelsQueries } from "@/lib/blog-automation/pexels";

export type BlogImageTopic =
  | "casino"
  | "nightlife"
  | "waterfall"
  | "north_goa"
  | "south_goa"
  | "dolphin"
  | "water_sports"
  | "scuba"
  | "island"
  | "trek"
  | "hotel"
  | "food"
  | "beach"
  | "general";

/** Stable hash for picking different photos per slug/title. */
export function blogImageVarietySeed(input: string): number {
  let h = 2166136261;
  const s = String(input || "goa").toLowerCase();
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function pickFromList<T>(items: T[], seed: string): T | null {
  if (!items.length) return null;
  const idx = blogImageVarietySeed(seed) % items.length;
  return items[idx] ?? items[0];
}

/** Infer topic from text only (title or slug fragment) — order matters. */
function inferTopicFromText(t: string): BlogImageTopic {
  if (/casino|gambling|poker|roulette|blackjack|baccarat|big daddy|deltin/.test(t)) {
    return "casino";
  }
  if (/night.?club|nightclub|disco\b|pub\b|nightlife|party|ruski|ruskii/.test(t)) {
    return "nightlife";
  }
  if (/dudhsagar|waterfall/.test(t)) return "waterfall";
  if (/north goa|fort aguada|anjuna|vagator/.test(t)) return "north_goa";
  if (/south goa|palolem|colva|benaulim/.test(t)) return "south_goa";
  if (/dolphin/.test(t)) return "dolphin";
  if (/parasail|jet.?ski|banana boat|water sport|watersport|flyboard|bungee/.test(t)) {
    return "water_sports";
  }
  if (/island|grande island|boat trip/.test(t)) return "island";
  if (/scuba|diving|underwater|snorkel/.test(t)) return "scuba";
  if (/trek|hiking|adventure trip/.test(t)) return "trek";
  if (/hotel|resort|stay/.test(t)) return "hotel";
  if (/food|restaurant|seafood/.test(t)) return "food";
  if (/beach|coast|sea/.test(t)) return "beach";
  return "general";
}

const SLUG_TOPIC_HINTS: Record<string, BlogImageTopic> = {
  "casino bookings": "casino",
  "casino-bookings": "casino",
  "night club": "nightlife",
  "night-club": "nightlife",
  pubs: "nightlife",
  disco: "nightlife",
  "water sports": "water_sports",
  "water-sports": "water_sports",
  "dolphin trip": "dolphin",
  "dolphin-trip": "dolphin",
  "scuba diving": "scuba",
  "scuba-diving": "scuba",
  "dudhsagar trip": "waterfall",
  "dudhsagar-trip": "waterfall",
  flyboarding: "water_sports",
  "bungee jumping": "water_sports",
  "north goa tour": "north_goa",
  "north-goa-tour": "north_goa",
  "south goa tour": "south_goa",
  "south-goa-tour": "south_goa",
};

export function inferServiceSlugFromTitle(title: string): string | null {
  const t = title.toLowerCase();
  if (/casino|big daddy|deltin|poker|blackjack/.test(t)) return "casino-bookings";
  if (/night.?club|nightclub|ruski|ruskii|disco\b|pub crawl/.test(t)) return "night-club";
  if (/dolphin/.test(t) && !/scuba|diving/.test(t)) return "dolphin-trip";
  if (
    /water.?sport|parasail|jet.?ski|banana boat|flyboard/.test(t) &&
    !/scuba|diving/.test(t)
  ) {
    return "water-sports";
  }
  if (/scuba|diving|snorkel|padi/.test(t)) return "scuba-diving";
  if (/dudhsagar|waterfall/.test(t)) return "dudhsagar-trip";
  if (/north goa/.test(t)) return "north-goa-tour";
  if (/south goa/.test(t)) return "south-goa-tour";
  return null;
}

/** Prefer title topic over a mismatched serviceSlug (e.g. scuba-diving slug on casino post). */
export function resolveEffectiveServiceSlug(title: string, serviceSlug: string): string {
  const fromTitle = inferServiceSlugFromTitle(title);
  if (fromTitle) return fromTitle;
  const slug = serviceSlug.trim().toLowerCase();
  if (slug) return slug;
  return "scuba-diving";
}

export function inferBlogImageTopic(title: string, serviceSlug = ""): BlogImageTopic {
  const titleNorm = title.toLowerCase().replace(/-/g, " ");
  const fromTitle = inferTopicFromText(titleNorm);
  if (fromTitle !== "general" && fromTitle !== "beach") {
    return fromTitle;
  }

  const slugNorm = serviceSlug.toLowerCase().replace(/-/g, " ");
  const fromSlug =
    SLUG_TOPIC_HINTS[slugNorm] ??
    SLUG_TOPIC_HINTS[serviceSlug.toLowerCase()] ??
    inferTopicFromText(slugNorm);
  if (fromSlug !== "general") return fromSlug;

  return inferTopicFromText(`${titleNorm} ${slugNorm}`);
}

/** Curated Wikimedia Commons URLs — stable, free, no API key. */
export const CURATED_BLOG_FALLBACK_URLS: Record<BlogImageTopic, string[]> = {
  casino: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Casino_de_Goa.jpg/1600px-Casino_de_Goa.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Casino_chips.jpg/1600px-Casino_chips.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Poker_chips.jpg/1600px-Poker_chips.jpg",
  ],
  nightlife: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Goa_nightlife.jpg/1600px-Goa_nightlife.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Club_lights.jpg/1600px-Club_lights.jpg",
  ],
  waterfall: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Dudhsagar_Falls.jpg/1600px-Dudhsagar_Falls.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Waterfall_in_India.jpg/1600px-Waterfall_in_India.jpg",
  ],
  north_goa: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Palolem_beach_Goa_India.jpg/1600px-Palolem_beach_Goa_India.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Fort_Aguada_Goa.jpg/1600px-Fort_Aguada_Goa.jpg",
  ],
  south_goa: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Palolem_beach_Goa_India.jpg/1600px-Palolem_beach_Goa_India.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Colva_Beach_Goa.jpg/1600px-Colva_Beach_Goa.jpg",
  ],
  dolphin: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Dolphin_in_water.jpg/1600px-Dolphin_in_water.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Dolphins_ocean.jpg/1600px-Dolphins_ocean.jpg",
  ],
  water_sports: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Parasailing_in_Goa.jpg/1600px-Parasailing_in_Goa.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Jet_ski_beach.jpg/1600px-Jet_ski_beach.jpg",
  ],
  scuba: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Scuba_diving.jpg/1600px-Scuba_diving.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Scuba_diver.jpg/1600px-Scuba_diver.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Underwater_scuba.jpg/1600px-Underwater_scuba.jpg",
  ],
  island: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Palolem_beach_Goa_India.jpg/1600px-Palolem_beach_Goa_India.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Tropical_island_boat.jpg/1600px-Tropical_island_boat.jpg",
  ],
  trek: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Western_Ghats_monsoon.jpg/1600px-Western_Ghats_monsoon.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Forest_trek_India.jpg/1600px-Forest_trek_India.jpg",
  ],
  hotel: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Palolem_beach_Goa_India.jpg/1600px-Palolem_beach_Goa_India.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Beach_resort_pool.jpg/1600px-Beach_resort_pool.jpg",
  ],
  food: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Seafood_platter.jpg/1600px-Seafood_platter.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Goan_fish_curry.jpg/1600px-Goan_fish_curry.jpg",
  ],
  beach: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Palolem_beach_Goa_India.jpg/1600px-Palolem_beach_Goa_India.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Goa_beach_sunset.jpg/1600px-Goa_beach_sunset.jpg",
  ],
  general: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Palolem_beach_Goa_India.jpg/1600px-Palolem_beach_Goa_India.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Goa_beach_sunset.jpg/1600px-Goa_beach_sunset.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Scuba_diving.jpg/1600px-Scuba_diving.jpg",
  ],
};

export function pickCuratedBlogFallbackUrl(
  title: string,
  serviceSlug: string,
  seed: string,
): string | null {
  const topic = inferBlogImageTopic(title, serviceSlug);
  const urls = CURATED_BLOG_FALLBACK_URLS[topic] ?? CURATED_BLOG_FALLBACK_URLS.general;
  return pickFromList(urls, seed || title);
}

export function stockImageSearchQueries(input: {
  title: string;
  serviceSlug: string;
  serviceName: string;
}): string[] {
  return buildPexelsQueries(input);
}
