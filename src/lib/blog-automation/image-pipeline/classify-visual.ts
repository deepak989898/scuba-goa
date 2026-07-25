import type {
  TimeOfDay,
  VisualCategory,
  VisualClassification,
} from "./types";
import {
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
  const slug = (input.serviceSlug || "").toLowerCase();
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
      peopleCount: partial.peopleCount || "2-4 adults",
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

  // 2) Nightlife — title-led; ignore scuba serviceSlug
  if (
    /night.?club|nightclub|russian.?club|disco\b|nightlife|party night|clubbing|goa nightlife/.test(
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
    !/nightlife|water.?sport|parasail|jet.?ski|dudhsagar|bungee|yacht|cruise/.test(
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
    if (/safety|safe|buddy check|regulator|beginner tip|risk/.test(titleText)) {
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
    if (/beginner|first.?time|learn|try scuba|open water course/.test(titleText)) {
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

  if (/price|cost|compare/.test(titleText)) {
    return pick("price_comparison", {
      visualIntent: "activity comparison without on-image prices",
      mainSubject:
        "Side-by-side beach activity preparation without any readable price text",
      timeOfDay: "soft_overcast",
      desiredComposition: "multi_subject",
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
