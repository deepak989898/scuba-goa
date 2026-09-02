import { createHash } from "crypto";

/** Known dive / travel destinations that appear in comparison titles. */
const DESTINATION_PATTERNS: Array<{ id: string; label: string; re: RegExp }> = [
  { id: "andaman", label: "Andaman Islands", re: /\bandamans?\b|\bhavelock\b|\bneil island\b/i },
  { id: "goa", label: "Goa", re: /\bgoa\b/i },
  { id: "maldives", label: "Maldives", re: /\bmaldives\b/i },
  { id: "lakshadweep", label: "Lakshadweep", re: /\blakshadweep\b/i },
  { id: "thailand", label: "Thailand", re: /\bthailand\b|\bphuket\b|\bkoh tao\b/i },
  { id: "bali", label: "Bali", re: /\bbali\b/i },
  { id: "pondicherry", label: "Pondicherry", re: /\bpondicherry\b|\bpuducherry\b/i },
  { id: "kerala", label: "Kerala", re: /\bkerala\b/i },
  { id: "lanka", label: "Sri Lanka", re: /\bsri\s*lanka\b/i },
];

export type ParsedComparison = {
  left: { id: string; label: string };
  right: { id: string; label: string };
  topicHint: "scuba" | "travel" | "general";
};

function findDestinations(text: string): Array<{ id: string; label: string }> {
  const found: Array<{ id: string; label: string }> = [];
  const seen = new Set<string>();
  for (const d of DESTINATION_PATTERNS) {
    if (d.re.test(text) && !seen.has(d.id)) {
      seen.add(d.id);
      found.push({ id: d.id, label: d.label });
    }
  }
  return found;
}

/**
 * Detect "Goa vs Andaman", "X versus Y", "X or Y" destination comparisons.
 */
export function parseDestinationComparison(title: string): ParsedComparison | null {
  const raw = title.trim();
  if (!raw) return null;

  const vsSplit = raw.split(/\s+(?:vs\.?|versus|v\/s)\s+/i);
  if (vsSplit.length >= 2) {
    const leftHits = findDestinations(vsSplit[0]!);
    const rightHits = findDestinations(vsSplit.slice(1).join(" "));
    if (leftHits[0] && rightHits[0] && leftHits[0].id !== rightHits[0].id) {
      const topicHint = /scuba|diving|snorkel/i.test(raw) ? "scuba" : "travel";
      return { left: leftHits[0], right: rightHits[0], topicHint };
    }
  }

  const dests = findDestinations(raw);
  if (
    dests.length >= 2 &&
    /\b(?:vs\.?|versus|compare|comparison|or|better)\b/i.test(raw)
  ) {
    return {
      left: dests[0]!,
      right: dests[1]!,
      topicHint: /scuba|diving|snorkel/i.test(raw) ? "scuba" : "travel",
    };
  }

  return null;
}

export function stablePick<T>(seed: string, items: readonly T[], salt = 0): T {
  const h = createHash("sha256").update(`${seed}::${salt}`).digest();
  return items[h.readUInt32BE(0) % items.length]!;
}

/** Distinct scuba hero scenes so posts do not share one generic diver. */
export const SCUBA_SUBJECT_VARIANTS = [
  "Two divers with sharp photoreal faces exploring a shallow reef with natural sun rays and correct BCD gear",
  "Dive boat on turquoise water with one instructor and one guest preparing tanks — clear natural faces, correct hands",
  "Instructor with a crisp realistic face guiding one first-time diver at a calm shore entry with mask and fins ready",
  "Split-level view: half above boat deck, half underwater with one diver descending — face clear above water if visible",
  "One diver with a natural sharp face giving an OK hand signal (correct five fingers) beside a sea turtle in clear coastal water",
  "Two divers floating near a rocky coastal reef with realistic visibility and photoreal faces",
  "Dive master leading one guest along a gentle underwater sand patch with soft light — faces readable through masks if shown",
  "Surface interval on a dive boat: two people resting with gear staged safely — sharp natural faces, no crowd",
] as const;

export const WATER_SPORTS_SUBJECT_VARIANTS = [
  "Busy Goa beach with parasail canopy lifting riders above turquoise water",
  "Jet ski cutting across clear coastal water with life jackets visible",
  "Banana boat full of laughing adults bouncing behind a speedboat near shore",
  "Mixed water-sports shoreline: parasail, jet ski wake and banana boat in one wide frame",
  "Speedboat departing a sandy Goa beach with life-jacketed guests aboard",
] as const;

export const NIGHTLIFE_SUBJECT_VARIANTS = [
  "Premium Goa nightclub interior with DJ booth, coloured stage lights and dance floor energy",
  "Stylish beach-club terrace at night overlooking the Arabian Sea with warm string lights",
  "Crowded but tasteful Goa club lounge with neon accents and adults socialising",
  "Outdoor night party deck near the beach with DJ console and soft purple-blue lighting",
] as const;

export const CASINO_SUBJECT_VARIANTS = [
  "Luxury offshore casino cruise ship at night with lit decks on the Arabian Sea near Goa",
  "Elegant casino interior with poker table, chips and soft ambient lighting — no readable text",
  "Guests entering a premium Goa casino venue with red carpet and warm golden interior lights",
  "Close-up of stacked casino chips and playing cards on a polished table — tasteful editorial style",
  "Night view of a floating casino boat with colourful lights reflecting on calm coastal water",
] as const;

export const CASINO_PRICING_SUBJECT_VARIANTS = [
  "Casino reception desk: staff showing a guest entry package folders side-by-side — blank or blurred text only",
  "Travellers comparing casino entry packages at a cruise boarding counter with chips display as props",
  "Concierge explaining VIP vs standard casino entry options at a lit venue entrance — no readable prices",
  "Side-by-side entry tiers: standard chips stack vs premium VIP lounge glimpse — same casino backdrop",
] as const;

export const DOLPHIN_TRIP_SUBJECT_VARIANTS = [
  "Early morning dolphin-watching boat on calm Goa waters with guests scanning the horizon",
  "Dolphins surfacing near a small tour boat with life-jacketed passengers and sunrise glow",
  "Coastal boat cruise leaving a Goa beach for dolphin spotting with clear Arabian Sea backdrop",
] as const;

/**
 * Price-guide visuals must read as planning / packages / cost comparison —
 * NOT a generic beach dive lifestyle shot. No readable currency or price numbers.
 */
export const SCUBA_PRICING_SUBJECT_VARIANTS = [
  "Dive shop booking desk: staff showing a guest three distinct package option cards side-by-side while a dive boat waits outside — cards have blank/blurred text only",
  "Over-shoulder view of travellers comparing two scuba package folders at a coastal booking counter, with fins and a mask on the desk as props",
  "Staff member with a clear realistic face explaining package choices to one guest at a beach dive counter, clipboard closed so no prices are readable — avoid finger-counting poses",
  "Side-by-side gear layouts suggesting budget vs premium packages: left simpler rental set, right fuller kit — same beach dive shop backdrop, no price tags",
  "Couple reviewing a dive trip brochure with a local advisor near a boat; advisor points at package columns on a blank rate sheet (unreadable text)",
  "Reception-style dive counter with a small payment terminal turned away, package pamphlet stack, and guests choosing between options — no currency symbols visible",
] as const;

export function sceneForDestination(
  destId: string,
  topic: "scuba" | "travel" | "general",
  side: "left" | "right",
): string {
  if (topic === "scuba") {
    switch (destId) {
      case "goa":
        return side === "left"
          ? "Goa side: beginner-friendly scuba diver with a sea turtle in softer coastal water"
          : "Goa side: calm boat dive near a sandy Indian shoreline with clear shallow water";
      case "andaman":
        return side === "left"
          ? "Andaman side: diver over vibrant coral reef with tropical fish"
          : "Andaman side: clear Andaman reef scuba scene with rich coral and blue visibility";
      case "maldives":
        return "Maldives side: crystal-clear overwater lagoon scuba with bright reef fish";
      case "lakshadweep":
        return "Lakshadweep side: pristine turquoise lagoon dive with healthy coral";
      case "thailand":
        return "Thailand side: tropical limestone-coast scuba with colourful reef life";
      case "bali":
        return "Bali side: warm tropical reef dive with soft coral and clear water";
      default:
        return `${side} destination scuba scene matching ${destId}`;
    }
  }
  switch (destId) {
    case "goa":
      return "Goa coastal beach and adventure vibe with warm Arabian Sea light";
    case "andaman":
      return "Andaman island turquoise water and lush green coastline";
    default:
      return `${destId} travel destination atmosphere`;
  }
}

export function buildComparisonMainSubject(parsed: ParsedComparison): string {
  const leftScene = sceneForDestination(parsed.left.id, parsed.topicHint, "left");
  const rightScene = sceneForDestination(parsed.right.id, parsed.topicHint, "right");
  return (
    `Photographic split-screen comparison diptych: LEFT half shows ${parsed.left.label} — ${leftScene}; ` +
    `RIGHT half shows ${parsed.right.label} — ${rightScene}. ` +
    `A clear diagonal or vertical divide separates the two halves so the viewer instantly understands a destination comparison. ` +
    `No text, letters, logos, or “VS” typography in the image — the split photography alone communicates the comparison.`
  );
}
