export type ContentTopicId =
  | "scuba"
  | "nightlife"
  | "casino"
  | "dolphin"
  | "watersports"
  | "tour"
  | "general";

export function detectContentTopic(input: {
  title: string;
  keywords: string[];
}): ContentTopicId {
  const hay = `${input.title} ${input.keywords.join(" ")}`.toLowerCase();

  if (
    /russian|night.?club|nightlife|nightclub|disco\b|\bpubs?\b|party|ruskii|ruski/.test(
      hay,
    )
  ) {
    return "nightlife";
  }
  if (/casino|gambling|poker|roulette|deltin|big daddy|bigdaddy/.test(hay)) {
    return "casino";
  }
  if (/dolphin/.test(hay) && !/scuba|diving/.test(hay)) return "dolphin";
  if (
    /water.?sport|parasail|jet.?ski|flyboard|bungee/.test(hay) &&
    !/scuba|diving/.test(hay)
  ) {
    return "watersports";
  }
  if (/scuba|diving|snorkel|underwater|padi/.test(hay)) return "scuba";
  if (/north goa|south goa|dudhsagar|trek|sightseeing/.test(hay)) return "tour";
  return "general";
}

export const TOPIC_SERVICE_PRIORITY: Record<ContentTopicId, string[]> = {
  nightlife: ["night-club", "pubs", "disco"],
  casino: ["casino-bookings"],
  scuba: [
    "scuba-diving",
    "scuba-diving-with-island-trip",
    "island-trip",
    "grande-island",
    "water-sports",
  ],
  dolphin: ["dolphin-trip"],
  watersports: ["water-sports", "flyboarding", "bungee-jumping"],
  tour: ["north-goa-tour", "south-goa-tour", "dudhsagar-trip"],
  general: [],
};

export const TOPIC_SERVICE_DEPRIORITIZE: Partial<
  Record<ContentTopicId, RegExp>
> = {
  nightlife: /scuba|diving|dolphin|water.?sport|flyboard|bungee/i,
  scuba: /night|club|casino|party|disco|pub/i,
  dolphin: /night|club|casino|disco/i,
  casino: /scuba|diving|dolphin/i,
};
