/**
 * Title-aware visual research before OpenAI image generation.
 * Encodes real venue facts (ship casinos on Mandovi, etc.) so prompts match the article.
 */

export type TitleResearchContext = {
  matchedVenueId?: string;
  venueName?: string;
  venueType?: string;
  locationDetail?: string;
  visualFacts: string[];
  /** Injected into OpenAI prompt — factual scene direction. */
  promptAddendum: string;
  /** Override main subject hint when venue-specific. */
  mainSubjectHint?: string;
};

type VenueDef = {
  id: string;
  patterns: RegExp;
  venueName: string;
  venueType: string;
  locationDetail: string;
  visualFacts: string[];
  subjectVariants: readonly string[];
};

const GOA_CASINO_VENUES: VenueDef[] = [
  {
    id: "big_daddy",
    patterns: /\bbig\s*daddy\b|bigdaddy/i,
    venueName: "Big Daddy Casino Goa",
    venueType: "offshore casino cruise ship on the Mandovi River",
    locationDetail: "Panjim (Panaji) waterfront, Mandovi River, North Goa",
    visualFacts: [
      "Big Daddy is a famous floating casino — a large multi-deck illuminated ship moored on the Mandovi River near Panjim",
      "The vessel has colourful deck lights at night; guests board from a river jetty — not a generic land casino building",
      "Panjim waterfront / Mandovi River promenade may appear in the background",
      "Do not depict a random indoor poker room without the iconic cruise-ship context",
    ],
    subjectVariants: [
      "Wide night photograph of Big Daddy Casino cruise ship lit up on the Mandovi River at Panjim with multi-deck lights reflecting on water",
      "Guests walking toward the illuminated Big Daddy casino ship boarding jetty on the Mandovi River at dusk",
      "Panjim waterfront view: the Big Daddy floating casino vessel dominating the frame, Arabian Sea / river mouth atmosphere",
      "Elegant adults at a casino ship entry gangway on the Mandovi — ship hull and deck lights clearly visible behind them",
    ],
  },
  {
    id: "deltin",
    patterns: /\bdeltin\b|deltin royale|deltin jaqk/i,
    venueName: "Deltin Casino Goa",
    venueType: "luxury offshore casino cruise ship",
    locationDetail: "Mandovi River / Panjim area, Goa",
    visualFacts: [
      "Deltin operates large luxury casino cruise ships on Goa's Mandovi River near Panjim",
      "Multi-deck white and gold lit vessel — iconic floating casino, not a small land venue",
      "River jetty boarding, night illumination, premium cruise-ship silhouette",
    ],
    subjectVariants: [
      "Deltin luxury casino cruise ship illuminated at night on the Mandovi River near Panjim",
      "Wide shot of Deltin floating casino vessel with guests boarding from Panjim jetty at blue hour",
      "Premium multi-deck casino ship on calm river water with Goa waterfront lights",
    ],
  },
  {
    id: "offshore_casino",
    patterns: /\boffshore casino\b|floating casino|casino cruise|casino ship|casino on ship/i,
    venueName: "Goa offshore casino",
    venueType: "floating casino cruise ship",
    locationDetail: "Mandovi River, Panjim, Goa",
    visualFacts: [
      "Goa offshore casinos are ships on the Mandovi River — show the vessel exterior, not only an interior table",
      "Jetty boarding, river reflections, multi-deck night lighting",
    ],
    subjectVariants: [
      "Offshore casino cruise ship on the Mandovi River at Panjim with deck lights and boarding jetty",
      "Floating casino vessel at night on Goa's Mandovi River — wide scenic composition",
    ],
  },
];

function matchVenue(title: string, keyword?: string): VenueDef | null {
  const hay = `${title} ${keyword || ""}`;
  for (const v of GOA_CASINO_VENUES) {
    if (v.patterns.test(hay)) return v;
  }
  return null;
}

function isAgeOrEntryArticle(title: string): boolean {
  return /age limit|minimum age|entry age|legal age|id required|dress code|entry package|entry fee/i.test(
    title,
  );
}

/**
 * Research factual visual context from title + keyword before generating an image.
 */
export function researchTitleForImage(input: {
  title: string;
  primaryKeyword?: string;
  serviceSlug?: string;
  serviceName?: string;
  contentExcerpt?: string;
}): TitleResearchContext {
  const title = input.title.trim();
  const venue = matchVenue(title, input.primaryKeyword);

  if (venue) {
    const ageEntry = isAgeOrEntryArticle(title);
    const facts = [...venue.visualFacts];
    if (ageEntry) {
      facts.push(
        "Article is about age limit / entry rules — show the casino ship exterior or boarding jetty with adult guests (21+ atmosphere), not children",
        "ID check / entry desk may appear at the ship gangway — no readable ID text or age numbers in the image",
      );
    }

    const subjectIdx =
      (title.length + (input.primaryKeyword?.length ?? 0)) % venue.subjectVariants.length;
    const mainSubjectHint = venue.subjectVariants[subjectIdx] ?? venue.subjectVariants[0];

    return {
      matchedVenueId: venue.id,
      venueName: venue.venueName,
      venueType: venue.venueType,
      locationDetail: venue.locationDetail,
      visualFacts: facts,
      mainSubjectHint,
      promptAddendum: [
        `VENUE RESEARCH (use this — do not invent a generic casino interior):`,
        `Venue: ${venue.venueName} — ${venue.venueType}.`,
        `Location: ${venue.locationDetail}.`,
        ...facts.map((f) => `• ${f}`),
        ageEntry
          ? "Depict the famous floating ship / Mandovi River setting relevant to age-limit and entry articles."
          : "The cruise ship on the Mandovi River must be recognisable as the hero subject.",
      ].join(" "),
    };
  }

  // Generic casino in Goa without a named venue
  if (/casino/i.test(title) || input.serviceSlug?.includes("casino")) {
    return {
      venueType: "Goa offshore / river casino",
      locationDetail: "Mandovi River or Panjim waterfront, Goa",
      visualFacts: [
        "Prefer illuminated casino cruise ship on Goa's Mandovi River rather than a generic land casino",
        "Panjim jetty boarding atmosphere at night",
      ],
      promptAddendum:
        "Goa casinos are often offshore ships on the Mandovi River near Panjim — show the vessel or riverfront boarding scene when the title mentions casino in Goa.",
    };
  }

  // Scuba trip from city — Goa destination only
  if (
    /\bfrom\s+[a-z]/i.test(title) &&
    /\btrip|travel|planning|guide\b/i.test(title) &&
    /scuba|diving/i.test(title)
  ) {
    return {
      promptAddendum:
        "Travellers planning a Goa scuba trip — show Goa beach / dive boat as destination, not origin-city documents or skylines.",
      visualFacts: ["Goa coastal dive centre or beach entry", "No archival documents or maps"],
    };
  }

  return {
    visualFacts: [],
    promptAddendum: "",
  };
}
