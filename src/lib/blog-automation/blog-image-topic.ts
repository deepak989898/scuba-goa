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
  if (/casino|gambling|poker|roulette|blackjack|baccarat|big daddy|bigdaddy|deltin/.test(t)) {
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

/** Verified Wikimedia Commons file titles — URLs resolved via API (never hardcoded thumbs). */
export const CURATED_WIKIMEDIA_FILE_TITLES: Record<BlogImageTopic, string[]> = {
  casino: [
    "Goa Casino ship on the Mandovi river March 2026.jpg",
    "Goa Casino ship on the Mandovi river March 2026 -002.jpg",
    "CasinoGoa.jpg",
    "Casino Pride Goa.jpg",
  ],
  nightlife: [
    "Devils Night Club Goa.jpg",
    "Goa nightlife.jpg",
    "Club lights.jpg",
  ],
  waterfall: [
    "Dudhsagar Falls.jpg",
    "Dudhsagar falls goa.jpg",
    "Waterfall in India.jpg",
  ],
  north_goa: [
    "Palolem Beach.jpg",
    "Fort Aguada Goa.jpg",
    "Anjuna beach Goa.jpg",
  ],
  south_goa: [
    "Palolem Beach.jpg",
    "Colva Beach Goa.jpg",
    "Agonda beach Goa.jpg",
  ],
  dolphin: [
    "Dolphin in water.jpg",
    "Dolphins ocean.jpg",
    "Dolphins in the ocean.jpg",
  ],
  water_sports: [
    "Parasailing in Goa.jpg",
    "Jet ski beach.jpg",
    "Water sports Goa.jpg",
  ],
  scuba: [
    "Arabian Sea Scuba Diving spot GOA.jpg",
    "Scuba diving.jpg",
    "Scuba diver.jpg",
    "Underwater scuba.jpg",
  ],
  island: [
    "Palolem Beach.jpg",
    "Grande Island Goa.jpg",
    "Boat trip Goa.jpg",
  ],
  trek: [
    "Western Ghats monsoon.jpg",
    "Forest trek India.jpg",
    "Trekking in India.jpg",
  ],
  hotel: [
    "Palolem Beach.jpg",
    "Beach resort pool.jpg",
    "Goa beach resort.jpg",
  ],
  food: [
    "Seafood platter.jpg",
    "Goan fish curry.jpg",
    "Seafood Goa.jpg",
  ],
  beach: [
    "Palolem Beach.jpg",
    "Goa beach sunset.jpg",
    "Agonda beach Goa.jpg",
  ],
  general: [
    "Palolem Beach.jpg",
    "Goa beach sunset.jpg",
    "Arabian Sea Scuba Diving spot GOA.jpg",
    "Fort Aguada Goa.jpg",
  ],
};

/** @deprecated Use CURATED_WIKIMEDIA_FILE_TITLES + API resolution */
export const CURATED_BLOG_FALLBACK_URLS: Record<BlogImageTopic, string[]> = {
  casino: [],
  nightlife: [],
  waterfall: [],
  north_goa: [],
  south_goa: [],
  dolphin: [],
  water_sports: [],
  scuba: [],
  island: [],
  trek: [],
  hotel: [],
  food: [],
  beach: [],
  general: [],
};

export function listCuratedFileTitlesForTopic(
  title: string,
  serviceSlug: string,
): string[] {
  const topic = inferBlogImageTopic(title, serviceSlug);
  const topicFiles = CURATED_WIKIMEDIA_FILE_TITLES[topic] ?? [];
  const generalFiles = CURATED_WIKIMEDIA_FILE_TITLES.general;
  return [...new Set([...topicFiles, ...generalFiles])];
}

/** Verified direct upload.wikimedia.org URLs for sync UI fallbacks (no API call). */
export const VERIFIED_WIKIMEDIA_DIRECT_URLS: Record<BlogImageTopic, string> = {
  casino:
    "https://upload.wikimedia.org/wikipedia/commons/8/89/Goa_Casino_ship_on_the_Mandovi_river_March_2026.jpg",
  nightlife:
    "https://upload.wikimedia.org/wikipedia/commons/4/46/Devils_Night_Club_Goa.jpg",
  waterfall:
    "https://upload.wikimedia.org/wikipedia/commons/5/50/Dudhsagar_Falls.jpg",
  north_goa:
    "https://upload.wikimedia.org/wikipedia/commons/3/31/Palolem_Beach.jpg",
  south_goa:
    "https://upload.wikimedia.org/wikipedia/commons/3/31/Palolem_Beach.jpg",
  dolphin:
    "https://upload.wikimedia.org/wikipedia/commons/3/31/Palolem_Beach.jpg",
  water_sports:
    "https://upload.wikimedia.org/wikipedia/commons/3/31/Palolem_Beach.jpg",
  scuba:
    "https://upload.wikimedia.org/wikipedia/commons/e/ec/Arabian_Sea_Scuba_Diving_spot_GOA.jpg",
  island:
    "https://upload.wikimedia.org/wikipedia/commons/3/31/Palolem_Beach.jpg",
  trek:
    "https://upload.wikimedia.org/wikipedia/commons/3/31/Palolem_Beach.jpg",
  hotel:
    "https://upload.wikimedia.org/wikipedia/commons/3/31/Palolem_Beach.jpg",
  food:
    "https://upload.wikimedia.org/wikipedia/commons/3/31/Palolem_Beach.jpg",
  beach:
    "https://upload.wikimedia.org/wikipedia/commons/3/31/Palolem_Beach.jpg",
  general:
    "https://upload.wikimedia.org/wikipedia/commons/3/31/Palolem_Beach.jpg",
};

export function pickCuratedBlogFallbackUrl(
  title: string,
  serviceSlug: string,
  seed: string,
): string | null {
  const topic = inferBlogImageTopic(title, serviceSlug);
  const pool = [
    VERIFIED_WIKIMEDIA_DIRECT_URLS[topic],
    VERIFIED_WIKIMEDIA_DIRECT_URLS.general,
  ];
  return pickFromList(pool, seed || title);
}

export function stockImageSearchQueries(input: {
  title: string;
  serviceSlug: string;
  serviceName: string;
}): string[] {
  return buildPexelsQueries(input);
}
