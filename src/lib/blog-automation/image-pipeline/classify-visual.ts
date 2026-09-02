import type {
  TimeOfDay,
  VisualCategory,
  VisualClassification,
} from "./types";
import {
  CASINO_PRICING_SUBJECT_VARIANTS,
  CASINO_SUBJECT_VARIANTS,
  DOLPHIN_TRIP_SUBJECT_VARIANTS,
  SCUBA_SUBJECT_VARIANTS,
  SCUBA_PRICING_SUBJECT_VARIANTS,
  WATER_SPORTS_SUBJECT_VARIANTS,
  NIGHTLIFE_SUBJECT_VARIANTS,
  buildComparisonMainSubject,
  parseDestinationComparison,
  stablePick,
} from "./title-scene";

/** Title + keyword only — service slug must not force scuba onto nightlife / water-sports posts. */
function titleHaystack(input: {
  title: string;
  primaryKeyword?: string;
}): string {
  return [input.title, input.primaryKeyword]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/** When blog post serviceSlug is wrong (e.g. scuba-diving on a casino article), trust the title. */
function resolveImageServiceSlug(
  titleText: string,
  serviceSlug?: string,
): string {
  if (/casino|gambling|poker|big daddy|deltin|blackjack|roulette|baccarat/.test(titleText)) {
    return "casino-bookings";
  }
  if (/night.?club|nightclub|ruski|ruskii|club ruski|disco\b|nightlife|clubbing/.test(titleText)) {
    return "night-club";
  }
  if (/dolphin/.test(titleText) && !/scuba|diving/.test(titleText)) {
    return "dolphin-trip";
  }
  if (
    /water.?sport|parasail|jet.?ski|banana boat|flyboard|bumper/.test(titleText) &&
    !/scuba|diving/.test(titleText)
  ) {
    return "water-sports";
  }
  return (serviceSlug || "").toLowerCase();
}

const SCUBA_EXCLUSIONS_FOR_NON_SCUBA = [
  "scuba diver",
  "oxygen tank",
  "scuba regulator",
  "underwater coral reef as main subject",
  "diving mask as hero prop",
  "diving fins as hero prop",
  "generic underwater exploration scene",
];

/**
 * Classify article into a visual category from title/keyword first.
 * Never map nightlife / water-sports / destination comparisons to generic scuba
 * just because the brand or serviceSlug mentions Scuba Goa.
 */
export function classifyVisualCategory(input: {
  title: string;
  primaryKeyword?: string;
  serviceSlug?: string;
  serviceName?: string;
  contentExcerpt?: string;
}): VisualClassification {
  const titleText = titleHaystack(input);
  const slug = resolveImageServiceSlug(titleText, input.serviceSlug);
  const seed = `${input.title}||${input.primaryKeyword || ""}`;

  const pick = (
    visualCategory: VisualCategory,
    partial: Partial<VisualClassification> & {
      mainSubject: string;
      visualIntent: string;
    },
  ): VisualClassification => {
    const isScubaVisual =
      visualCategory.startsWith("scuba_") ||
      (visualCategory === "destination_comparison" &&
        /scuba|diving|diver|reef/i.test(partial.mainSubject));
    return {
      visualCategory,
      visualSubcategory: partial.visualSubcategory || visualCategory,
      visualIntent: partial.visualIntent,
      mainSubject: partial.mainSubject,
      supportingSubjects: partial.supportingSubjects || [],
      location: partial.location || "Goa, India coastal setting",
      timeOfDay: partial.timeOfDay || "golden_hour",
      desiredComposition: partial.desiredComposition || "depth_layers",
      peopleCount: partial.peopleCount || "1-2 adults with clear sharp faces",
      safetyEquipment: partial.safetyEquipment || [],
      exclusions: [
        ...(partial.exclusions || []),
        ...(isScubaVisual && visualCategory !== "destination_comparison"
          ? []
          : visualCategory === "destination_comparison"
            ? []
            : SCUBA_EXCLUSIONS_FOR_NON_SCUBA),
        "large logo",
        "watermark",
        "embedded headline text",
        "readable words or letters in the image",
        "VS typography",
        "UI mockup",
        "blurry faces",
        "plastic or waxy AI skin",
        "melted or fused fingers",
        "deformed eyes or asymmetrical face",
        "mannequin-like people",
      ],
      isScubaVisual,
    };
  };

  // 1) Destination comparisons (Goa vs Andaman) — before beginner/scuba canned scenes
  const comparison = parseDestinationComparison(input.title);
  if (comparison) {
    return pick("destination_comparison", {
      visualSubcategory: `${comparison.left.id}_vs_${comparison.right.id}`,
      visualIntent: `visual destination comparison: ${comparison.left.label} vs ${comparison.right.label}`,
      mainSubject: buildComparisonMainSubject(comparison),
      supportingSubjects: [
        `${comparison.left.label} half of frame`,
        `${comparison.right.label} half of frame`,
        "clear photographic split",
      ],
      location: `${comparison.left.label} and ${comparison.right.label}`,
      timeOfDay:
        comparison.topicHint === "scuba" ? "underwater_rays" : "clear_morning",
      desiredComposition: "split_comparison",
      peopleCount: "divers or travellers on each side as needed",
      safetyEquipment:
        comparison.topicHint === "scuba"
          ? ["BCD", "mask", "fins", "realistic dive gear"]
          : [],
      exclusions: [
        "single undifferentiated beach briefing scene",
        "generic stock scuba diver as only subject",
        "both halves looking identical",
        "text overlays",
        "logo watermarks",
        "nightclub",
      ],
    });
  }

  // 2) Casino — title-led; never default to scuba for Big Daddy / entry / chips stories
  if (
    /casino|gambling|poker|roulette|blackjack|baccarat|big daddy|deltin|casino cruise|offshore casino/.test(
      titleText,
    ) ||
    (slug.includes("casino") && !/scuba|diving/.test(titleText))
  ) {
    const isPricing =
      /price|pricing|cost|cheap|budget|package|how much|age limit|entry|fee|charges/.test(
        titleText,
      );
    if (isPricing) {
      return pick("casino_pricing", {
        visualSubcategory: /age limit/.test(titleText) ? "age_entry" : "pricing",
        visualIntent: "casino entry / package pricing atmosphere — not scuba diving",
        mainSubject: stablePick(seed, CASINO_PRICING_SUBJECT_VARIANTS, 3),
        supportingSubjects: ["entry desk or cruise boarding", "chips as props only"],
        location: "Goa offshore casino or onshore casino venue",
        timeOfDay: "nightclub_lighting",
        desiredComposition: "subject_left",
        peopleCount: "staff + 1-2 adult guests",
        exclusions: [
          "scuba diving",
          "underwater scene",
          "dive tanks",
          "readable price text",
          "currency symbols",
          "old documents or letters",
        ],
      });
    }
    return pick("casino", {
      visualSubcategory: /big daddy/.test(titleText) ? "big_daddy" : "casino",
      visualIntent: "premium Goa casino experience — cruise or venue",
      mainSubject: stablePick(seed, CASINO_SUBJECT_VARIANTS, 4),
      supportingSubjects: ["chips or cards as secondary props", "night coastal lights"],
      location: "Goa casino cruise or casino venue",
      timeOfDay: "nightclub_lighting",
      desiredComposition: "environment_dominant",
      peopleCount: "adult guests optional",
      exclusions: [
        "scuba diving",
        "underwater coral",
        "dive gear as hero",
        "old newspaper scans",
        "readable text",
        "daytime beach scuba",
      ],
    });
  }

  // 3) Nightlife — title-led; ignore scuba serviceSlug
  if (
    /night.?club|nightclub|russian.?club|ruski|ruskii|disco\b|nightlife|party night|clubbing|goa nightlife/.test(
      titleText,
    ) ||
    (/night-club|disco|pubs|nightlife/.test(slug) &&
      !/scuba|diving/.test(titleText))
  ) {
    return pick("nightlife", {
      visualSubcategory: /club/.test(titleText) ? "night_club" : "nightlife",
      visualIntent: "premium nightlife venue atmosphere",
      mainSubject: stablePick(seed, NIGHTLIFE_SUBJECT_VARIANTS, 1),
      supportingSubjects: ["adult guests socialising", "stage lights"],
      location: "Goa nightlife venue",
      timeOfDay: "nightclub_lighting",
      desiredComposition: "environment_dominant",
      peopleCount: "several adults",
      exclusions: [
        "children",
        "scuba diving",
        "daytime family beach",
        "water-sports equipment",
        "underwater scene",
        "sexualized content",
        "generic scuba diver",
      ],
    });
  }

  if (/dolphin/.test(titleText) || slug.includes("dolphin")) {
    if (!/scuba|diving/.test(titleText)) {
      return pick("dolphin_trip", {
        visualIntent: "dolphin watching boat trip",
        mainSubject: stablePick(seed, DOLPHIN_TRIP_SUBJECT_VARIANTS, 2),
        supportingSubjects: ["life jackets", "sunrise coastal horizon"],
        location: "Goa coastal waters",
        timeOfDay: "clear_morning",
        desiredComposition: "environment_dominant",
        safetyEquipment: ["life jackets"],
        exclusions: ["scuba diver underwater", "nightclub", "casino"],
      });
    }
  }

  if (/dinner.?cruise|sunset.?cruise|party.?boat/.test(titleText)) {
    return pick("dinner_cruise", {
      visualIntent: "evening cruise dining experience",
      mainSubject: "Guests enjoying a dinner cruise on a lit boat at dusk",
      supportingSubjects: ["Arabian Sea horizon", "soft deck lighting"],
      timeOfDay: "blue_hour",
      desiredComposition: "subject_left",
    });
  }

  if (/yacht|luxury.?boat/.test(titleText)) {
    return pick("yacht", {
      visualIntent: "luxury yacht coastal experience",
      mainSubject: "Modern yacht anchored near a Goa coastline",
      timeOfDay: "golden_hour",
      desiredComposition: "environment_dominant",
    });
  }

  if (/dudhsagar|waterfall/.test(titleText) || slug.includes("dudhsagar")) {
    return pick("dudhsagar", {
      visualIntent: "waterfall day trip scenery",
      mainSubject:
        "Dudhsagar waterfall cascading through greenery with distant travellers",
      location: "Dudhsagar Falls, Goa–Karnataka border",
      timeOfDay: "soft_overcast",
      desiredComposition: "environment_dominant",
      exclusions: ["scuba diver", "nightclub"],
    });
  }

  if (/bungee/.test(titleText) || slug.includes("bungee")) {
    return pick("bungee", {
      visualIntent: "controlled adventure jump",
      mainSubject:
        "Person preparing for a bungee jump with harness and instructor",
      safetyEquipment: ["harness", "helmet if required"],
      timeOfDay: "midday",
      desiredComposition: "diagonal_action",
    });
  }

  if (/flyboard/.test(titleText) || slug.includes("flyboard")) {
    return pick("flyboarding", {
      visualIntent: "surface flyboard action",
      mainSubject: "Rider on a flyboard rising above turquoise coastal water",
      safetyEquipment: ["life jacket"],
      timeOfDay: "midday",
      desiredComposition: "diagonal_action",
    });
  }

  if (/parasail/.test(titleText)) {
    return pick("parasailing", {
      visualIntent: "beach parasailing action",
      mainSubject: "Parasail canopy lifting riders above a Goa beach",
      safetyEquipment: ["harness", "life jacket"],
      timeOfDay: "clear_morning",
      desiredComposition: "diagonal_action",
    });
  }

  if (/jet.?ski|jetski/.test(titleText)) {
    return pick("jet_ski", {
      visualIntent: "jet ski coastal action",
      mainSubject: "Jet ski cutting across clear coastal water near a Goa beach",
      safetyEquipment: ["life jacket"],
      timeOfDay: "midday",
      desiredComposition: "diagonal_action",
    });
  }

  if (
    /water.?sport|banana.?boat|speedboat|kayak|top \d+ water/.test(titleText) ||
    (slug.includes("water-sport") && !/scuba|diving/.test(titleText))
  ) {
    return pick("water_sports", {
      visualIntent: "mixed water sports beach energy",
      mainSubject: stablePick(seed, WATER_SPORTS_SUBJECT_VARIANTS, 2),
      supportingSubjects: ["life jackets", "sunny shoreline"],
      safetyEquipment: ["life jackets"],
      timeOfDay: "midday",
      desiredComposition: "multi_subject",
      exclusions: [
        "underwater-only scuba scene",
        "generic stationary diver",
        "nightclub elements",
        "identical scuba stock photo",
      ],
    });
  }

  if (
    /north goa|anjuna|vagator|calangute|baga|fort aguada/.test(titleText) ||
    slug.includes("north-goa")
  ) {
    if (!/scuba|diving|underwater/.test(titleText)) {
      return pick("north_goa", {
        visualIntent: "North Goa sightseeing",
        mainSubject: "North Goa coastal viewpoint with beach and cliff scenery",
        timeOfDay: "golden_hour",
        desiredComposition: "environment_dominant",
      });
    }
  }

  if (
    /south goa|palolem|colva|benaulim|agonda/.test(titleText) ||
    slug.includes("south-goa")
  ) {
    if (!/scuba|diving|underwater/.test(titleText)) {
      return pick("south_goa", {
        visualIntent: "South Goa sightseeing",
        mainSubject: "Quiet South Goa beach with palm-lined shoreline",
        timeOfDay: "golden_hour",
        desiredComposition: "environment_dominant",
      });
    }
  }

  if (/family|kids|children|with kids/.test(titleText)) {
    return pick("family", {
      visualIntent: "family-friendly daytime Goa activity",
      mainSubject:
        "Family enjoying a calm daytime Goa beach walk or gentle boat experience",
      peopleCount: "family with children",
      timeOfDay: "clear_morning",
      desiredComposition: "multi_subject",
      exclusions: [
        "nightclub",
        "risky unsupported activity",
        "generic scuba diver hero",
      ],
    });
  }

  if (/couple|honeymoon|romantic/.test(titleText)) {
    return pick("couples", {
      visualIntent: "couples travel atmosphere",
      mainSubject: "Couple enjoying a scenic Goa sunset by the shoreline",
      peopleCount: "two adults",
      timeOfDay: "sunset",
      desiredComposition: "subject_left",
    });
  }

  if (/island|grande island|st\.?\s*george/.test(titleText)) {
    if (/scuba|diving/.test(titleText)) {
      return pick("scuba_location", {
        visualSubcategory: "island_dive",
        visualIntent: "island dive trip scenery",
        mainSubject:
          "Small diving boat approaching a tropical island with divers preparing equipment on deck",
        supportingSubjects: ["island coastline", "dive gear staged safely"],
        location: "Island waters off Goa",
        timeOfDay: "clear_morning",
        desiredComposition: "environment_dominant",
        safetyEquipment: ["BCD", "tanks secured", "masks"],
        exclusions: [
          "single generic diver floating over coral as only subject",
          "nightclub",
        ],
      });
    }
    return pick("island_guide", {
      visualIntent: "island travel overview",
      mainSubject: "Boat approaching a tropical island with turquoise water",
      timeOfDay: "clear_morning",
      desiredComposition: "environment_dominant",
    });
  }

  // Scuba-specific — title or explicit scuba slug (not nightlife/water-sports titles)
  const titleIsScuba = /scuba|diving|underwater|snorkel/.test(titleText);
  const slugIsScuba =
    slug.includes("scuba") &&
    !/casino|night.?club|nightlife|water.?sport|parasail|jet.?ski|dudhsagar|bungee|yacht|cruise|disco|pub|dolphin|ruski|ruskii/.test(
      titleText,
    );

  if (titleIsScuba || slugIsScuba) {
    // Price / cost / packages FIRST — must not fall through to generic beach gear scenes
    if (
      /price|pricing|cost|cheap|budget|package|how much|rate.?card|fee|₹|rs\.?/.test(
        titleText,
      )
    ) {
      return pick("scuba_pricing", {
        visualSubcategory: /guide|202\d/.test(titleText)
          ? "price_guide"
          : "pricing",
        visualIntent:
          "scuba price guide / package planning — viewer must instantly sense cost comparison and booking choices",
        mainSubject: stablePick(seed, SCUBA_PRICING_SUBJECT_VARIANTS, 5),
        supportingSubjects: [
          "dive shop or beach booking counter",
          "package option cards or folders with unreadable text",
          "subtle dive gear props (mask/fins) — not the hero subject",
        ],
        location: "Goa dive shop / beach booking desk",
        timeOfDay: "soft_overcast",
        desiredComposition: "subject_left",
        peopleCount: "staff + 1-2 travellers",
        safetyEquipment: ["mask", "fins as desk props"],
        exclusions: [
          "generated price text",
          "currency symbols",
          "rupee or dollar amounts",
          "fake discount stickers",
          "year numbers like 2026 drawn in the image",
          "generic tanks lined up on sand as the only story",
          "lifestyle beach chat with no booking/package cue",
          "underwater reef exploration hero",
          "nightclub",
        ],
      });
    }
    // Broad guides that mention safety + sites/expectations → location overview, not gear close-up only
    const isBroadDiveGuide =
      /sites?|spots?|what to expect|complete guide|best scuba|where to dive/.test(
        titleText,
      );
    if (
      /safety|safe|buddy check|regulator|beginner tip|risk/.test(titleText) &&
      !isBroadDiveGuide
    ) {
      return pick("scuba_safety", {
        visualIntent: "scuba safety training",
        mainSubject:
          "Dive instructor checking a beginner’s mask, regulator and buoyancy vest before entering the water",
        supportingSubjects: ["training pier or calm shore entry"],
        timeOfDay: "clear_morning",
        desiredComposition: "centred",
        peopleCount: "instructor + beginner",
        safetyEquipment: ["BCD", "regulator", "mask", "fins"],
        exclusions: [
          "generic underwater exploration hero",
          "panic or medical emergency",
          "reckless behaviour",
          "missing essential scuba gear",
        ],
      });
    }
    if (isBroadDiveGuide) {
      return pick("scuba_location", {
        visualSubcategory: "sites_safety_expect",
        visualIntent:
          "best dive sites overview with safety-ready guests — what a Goa scuba day looks like",
        mainSubject: stablePick(
          seed,
          [
            "Two people only on a dive boat at a clear Goa site: instructor with a sharp realistic face pointing to the water, one guest beside him in BCD with equally clear natural face — no crowd",
            "Close enough medium shot: instructor checking one guest’s mask and BCD on a boat, both faces sharp and photoreal, scenic Goa coastline softly behind them",
            "One instructor and one guest preparing fins on a boat deck at a Goa dive area; faces crisp and natural, hands anatomically correct, site visible in background",
            "Over-shoulder of one diver looking toward a Goa dive-site shoreline while a second person adjusts a regulator — faces readable, not tiny",
          ] as const,
          6,
        ),
        supportingSubjects: [
          "recognisable coastal dive-site backdrop",
          "safety gear correctly worn",
          "calm what-to-expect briefing energy",
          "sharp photoreal human faces",
        ],
        location: "Goa dive sites / coastal waters",
        timeOfDay: "clear_morning",
        desiredComposition: "environment_dominant",
        peopleCount: "exactly 2 adults with clear faces (instructor + 1 guest)",
        safetyEquipment: ["BCD", "mask", "fins", "regulator"],
        exclusions: [
          "tight close-up of only equipment with no dive-site context",
          "crowded boat with 4+ faces",
          "blurry or plastic faces",
          "fused or melted fingers",
          "nightclub",
          "generic lone diver stock pose with no location story",
          "panic or emergency",
        ],
      });
    }
    if (
      /beginner|first.?time|learn|try scuba|open water course/.test(titleText)
    ) {
      return pick("scuba_beginner", {
        visualIntent: "beginner scuba introduction",
        mainSubject: stablePick(
          seed,
          [
            "Friendly instructor briefing first-time divers beside a dive boat with gear laid out",
            "Beginner diver practising mask skills in shallow clear water with instructor nearby",
            "First-time guests in wetsuits receiving a calm beach-entry briefing with tanks ready",
            "Instructor demonstrating OK hand signal to beginners on a dive boat deck",
          ] as const,
          3,
        ),
        timeOfDay: "clear_morning",
        desiredComposition: "depth_layers",
        safetyEquipment: ["BCD", "mask", "fins"],
        exclusions: ["nightclub", "unsafe solo deep dive"],
      });
    }
    if (
      /spot|site|location|where to|vagator|calangute|anjuna|palolem/.test(
        titleText,
      )
    ) {
      return pick("scuba_location", {
        visualIntent: "dive site / location guide",
        mainSubject:
          "Divers entering clear coastal water from a boat near a recognisable Goa shoreline",
        timeOfDay: "midday",
        desiredComposition: "environment_dominant",
        exclusions: ["identical generic coral-only portrait"],
      });
    }
    if (
      /\bfrom\s+[a-z][a-z\s]{2,24}\b/i.test(titleText) &&
      /\btrip|travel|planning|guide|visit\b/i.test(titleText)
    ) {
      return pick("scuba_diving", {
        visualSubcategory: "origin_travel",
        visualIntent:
          "travellers planning a Goa scuba trip from another Indian city — Goa destination dominates",
        mainSubject: stablePick(
          seed,
          [
            "Two travellers with sharp photoreal faces at a sunny Goa beach dive centre with scuba tanks and boat in background — Arabian Sea coastline, not northern city landmarks",
            "Happy guests preparing scuba gear on a Goa boat jetty with turquoise water — clear Goa coastal setting",
            "Instructor welcoming travellers at a Goa dive shop with gear racks and ocean view — adventure trip mood",
            "Divers walking toward a Goa beach entry point with BCD and fins — tropical Goa shoreline dominant",
          ] as const,
          7,
        ),
        supportingSubjects: [
          "Goa beach or boat jetty",
          "scuba equipment staged safely",
          "travel adventure energy",
        ],
        location: "Goa coastal dive centre / beach (destination only)",
        timeOfDay: "clear_morning",
        desiredComposition: "environment_dominant",
        peopleCount: "1-2 adults with clear faces",
        safetyEquipment: ["BCD", "mask", "fins"],
        exclusions: [
          "Chandigarh or northern city skylines",
          "old documents letters or book scans",
          "maps or archival manuscripts",
          "origin-city monuments as main subject",
          "nightclub",
        ],
      });
    }
    return pick("scuba_diving", {
      visualIntent: "authentic scuba experience matching the article title",
      mainSubject: stablePick(seed, SCUBA_SUBJECT_VARIANTS, 4),
      timeOfDay: "underwater_rays",
      desiredComposition: "depth_layers",
      safetyEquipment: ["BCD", "regulator", "mask", "fins"],
      exclusions: [
        "fantasy creatures",
        "unsafe diving behaviour",
        "identical lone diver stock pose reused across posts",
      ],
    });
  }

  if (/beach|shore|coast/.test(titleText)) {
    return pick("beach_guide", {
      visualIntent: "beach travel guide",
      mainSubject:
        "Scenic Goa beach with clear water and natural coastal atmosphere",
      timeOfDay: "golden_hour",
      desiredComposition: "environment_dominant",
    });
  }

  if (/book|booking|reserve|deposit/.test(titleText)) {
    return pick("booking_guide", {
      visualIntent: "friendly booking / trip planning atmosphere",
      mainSubject:
        "Travellers speaking with a local adventure desk near a boat and coastal backdrop",
      timeOfDay: "clear_morning",
      desiredComposition: "subject_right",
      exclusions: ["fake UI screenshots", "price text overlay"],
    });
  }

  if (/price|cost|compare/.test(titleText) && !titleIsScuba && !slugIsScuba) {
    return pick("price_comparison", {
      visualIntent: "activity comparison without on-image prices",
      mainSubject:
        "Side-by-side activity preparation matching the article topic — not scuba unless title says scuba",
      timeOfDay: "soft_overcast",
      desiredComposition: "multi_subject",
      exclusions: ["scuba diving unless title mentions scuba", "readable price text"],
    });
  }

  if (/safety|tip|guide/.test(titleText) && !/scuba|diving/.test(titleText)) {
    return pick("safety_guide", {
      visualIntent: "general travel safety",
      mainSubject:
        "Guide briefing travellers on safe coastal activity with life jackets visible",
      safetyEquipment: ["life jackets"],
      timeOfDay: "clear_morning",
      desiredComposition: "centred",
    });
  }

  // Fallback: use title words so we never default every post to the same scuba diver
  const titleSnippet = input.title.replace(/\s+/g, " ").trim().slice(0, 80);
  return pick("general_travel", {
    visualIntent: `editorial scene for: ${titleSnippet}`,
    mainSubject: `Authentic Goa travel photograph that clearly illustrates the topic "${titleSnippet}" — not a generic scuba diver`,
    timeOfDay: "golden_hour",
    desiredComposition: "environment_dominant",
    exclusions: [
      "generic stock scuba diver as default subject",
      "underwater coral if the title is unrelated to diving",
    ],
  });
}

export function lightingForTime(time: TimeOfDay): string {
  switch (time) {
    case "clear_morning":
      return "Clear morning tropical light, crisp shadows, fresh coastal air";
    case "midday":
      return "Bright midday tropical light with vivid but natural colour";
    case "golden_hour":
      return "Warm golden-hour sunlight, soft long shadows";
    case "sunset":
      return "Sunset glow over the Arabian Sea, warm orange-pink sky";
    case "blue_hour":
      return "Blue-hour evening light with subtle artificial accents";
    case "nightclub_lighting":
      return "Premium nightclub lighting — coloured stage lights, no harsh flash";
    case "underwater_rays":
      return "Natural underwater sun rays, clear visibility, realistic water colour";
    case "soft_overcast":
      return "Soft overcast travel photography light, even exposure";
    default:
      return "Natural editorial travel lighting";
  }
}
