import type {
  TimeOfDay,
  VisualCategory,
  VisualClassification,
} from "./types";

function haystack(input: {
  title: string;
  primaryKeyword?: string;
  serviceSlug?: string;
  serviceName?: string;
  contentExcerpt?: string;
}): string {
  return [
    input.title,
    input.primaryKeyword,
    input.serviceSlug?.replace(/-/g, " "),
    input.serviceName,
    input.contentExcerpt?.slice(0, 800),
  ]
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
 * Classify article into a visual category from title/keyword/service/body.
 * Never map everything to scuba just because the brand mentions Scuba Goa.
 */
export function classifyVisualCategory(input: {
  title: string;
  primaryKeyword?: string;
  serviceSlug?: string;
  serviceName?: string;
  contentExcerpt?: string;
}): VisualClassification {
  const t = haystack(input);
  const slug = (input.serviceSlug || "").toLowerCase();

  const pick = (
    visualCategory: VisualCategory,
    partial: Partial<VisualClassification> & {
      mainSubject: string;
      visualIntent: string;
    },
  ): VisualClassification => {
    const isScubaVisual = visualCategory.startsWith("scuba_");
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
        ...(isScubaVisual ? [] : SCUBA_EXCLUSIONS_FOR_NON_SCUBA),
        "large logo",
        "watermark",
        "embedded headline text",
        "UI mockup",
      ],
      isScubaVisual,
    };
  };

  // Nightlife / clubs first — brand must not force scuba visuals
  if (
    /night.?club|nightclub|russian.?club|disco\b|nightlife|party night|clubbing/.test(
      t,
    ) ||
    /night-club|disco|pubs/.test(slug)
  ) {
    return pick("nightlife", {
      visualSubcategory: /club/.test(t) ? "night_club" : "nightlife",
      visualIntent: "premium nightlife venue atmosphere",
      mainSubject:
        "Elegant Goa nightclub interior with DJ console, dance floor and premium lighting",
      supportingSubjects: ["adult guests socialising", "stage lights"],
      location: "Goa nightlife venue interior",
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
      ],
    });
  }

  if (/dinner.?cruise|sunset.?cruise|party.?boat/.test(t)) {
    return pick("dinner_cruise", {
      visualIntent: "evening cruise dining experience",
      mainSubject: "Guests enjoying a dinner cruise on a lit boat at dusk",
      supportingSubjects: ["Arabian Sea horizon", "soft deck lighting"],
      timeOfDay: "blue_hour",
      desiredComposition: "subject_left",
    });
  }

  if (/yacht|luxury.?boat/.test(t)) {
    return pick("yacht", {
      visualIntent: "luxury yacht coastal experience",
      mainSubject: "Modern yacht anchored near a Goa coastline",
      timeOfDay: "golden_hour",
      desiredComposition: "environment_dominant",
    });
  }

  if (/dudhsagar|waterfall/.test(t) || slug.includes("dudhsagar")) {
    return pick("dudhsagar", {
      visualIntent: "waterfall day trip scenery",
      mainSubject: "Dudhsagar waterfall cascading through greenery with distant travellers",
      location: "Dudhsagar Falls, Goa–Karnataka border",
      timeOfDay: "soft_overcast",
      desiredComposition: "environment_dominant",
      exclusions: ["scuba diver", "nightclub"],
    });
  }

  if (/bungee/.test(t) || slug.includes("bungee")) {
    return pick("bungee", {
      visualIntent: "controlled adventure jump",
      mainSubject: "Person preparing for a bungee jump with harness and instructor",
      safetyEquipment: ["harness", "helmet if required"],
      timeOfDay: "midday",
      desiredComposition: "diagonal_action",
    });
  }

  if (/flyboard/.test(t) || slug.includes("flyboard")) {
    return pick("flyboarding", {
      visualIntent: "surface flyboard action",
      mainSubject: "Rider on a flyboard rising above turquoise coastal water",
      safetyEquipment: ["life jacket"],
      timeOfDay: "midday",
      desiredComposition: "diagonal_action",
    });
  }

  if (/parasail/.test(t)) {
    return pick("parasailing", {
      visualIntent: "beach parasailing action",
      mainSubject: "Parasail canopy lifting riders above a Goa beach",
      safetyEquipment: ["harness", "life jacket"],
      timeOfDay: "clear_morning",
      desiredComposition: "diagonal_action",
    });
  }

  if (/jet.?ski|jetski/.test(t)) {
    return pick("jet_ski", {
      visualIntent: "jet ski coastal action",
      mainSubject: "Jet ski cutting across clear coastal water near a Goa beach",
      safetyEquipment: ["life jacket"],
      timeOfDay: "midday",
      desiredComposition: "diagonal_action",
    });
  }

  if (
    /water.?sport|banana.?boat|speedboat|kayak/.test(t) ||
    slug.includes("water-sport")
  ) {
    return pick("water_sports", {
      visualIntent: "mixed water sports beach energy",
      mainSubject:
        "Dynamic Goa beach scene with balanced parasailing, jet ski and banana boat activity",
      supportingSubjects: ["life jackets", "sunny shoreline"],
      safetyEquipment: ["life jackets"],
      timeOfDay: "midday",
      desiredComposition: "multi_subject",
      exclusions: [
        "underwater-only scuba scene",
        "generic stationary diver",
        "nightclub elements",
      ],
    });
  }

  if (
    /north goa|anjuna|vagator|calangute|baga|fort aguada/.test(t) ||
    slug.includes("north-goa")
  ) {
    // Location articles that also mention scuba stay location-led if scuba is not dominant
    if (/scuba|diving/.test(t) && /safety|beginner|tip/.test(t)) {
      /* fall through */
    } else if (!/scuba|diving|underwater/.test(t)) {
      return pick("north_goa", {
        visualIntent: "North Goa sightseeing",
        mainSubject: "North Goa coastal viewpoint with beach and cliff scenery",
        timeOfDay: "golden_hour",
        desiredComposition: "environment_dominant",
      });
    }
  }

  if (
    /south goa|palolem|colva|benaulim|agonda/.test(t) ||
    slug.includes("south-goa")
  ) {
    if (!/scuba|diving|underwater/.test(t)) {
      return pick("south_goa", {
        visualIntent: "South Goa sightseeing",
        mainSubject: "Quiet South Goa beach with palm-lined shoreline",
        timeOfDay: "golden_hour",
        desiredComposition: "environment_dominant",
      });
    }
  }

  if (/family|kids|children|with kids/.test(t)) {
    return pick("family", {
      visualIntent: "family-friendly daytime Goa activity",
      mainSubject:
        "Family enjoying a calm daytime Goa beach walk or gentle boat experience",
      peopleCount: "family with children",
      timeOfDay: "clear_morning",
      desiredComposition: "multi_subject",
      exclusions: ["nightclub", "risky unsupported activity", "generic scuba diver hero"],
    });
  }

  if (/couple|honeymoon|romantic/.test(t)) {
    return pick("couples", {
      visualIntent: "couples travel atmosphere",
      mainSubject: "Couple enjoying a scenic Goa sunset by the shoreline",
      peopleCount: "two adults",
      timeOfDay: "sunset",
      desiredComposition: "subject_left",
    });
  }

  if (/island|grande island|st\.?\s*george/.test(t)) {
    if (/scuba|diving/.test(t)) {
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

  // Scuba-specific intents
  if (/scuba|diving|underwater|snorkel/.test(t) || slug.includes("scuba")) {
    if (/safety|safe|buddy check|regulator|beginner tip|risk/.test(t)) {
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
    if (/beginner|first.?time|learn|try scuba|open water course/.test(t)) {
      return pick("scuba_beginner", {
        visualIntent: "beginner scuba introduction",
        mainSubject:
          "Friendly instructor briefing first-time divers beside a dive boat with gear laid out",
        timeOfDay: "clear_morning",
        desiredComposition: "depth_layers",
        safetyEquipment: ["BCD", "mask", "fins"],
        exclusions: ["nightclub", "unsafe solo deep dive"],
      });
    }
    if (/price|cost|cheap|budget|package|how much/.test(t)) {
      return pick("scuba_pricing", {
        visualIntent: "equipment and booking context without price text",
        mainSubject:
          "Neatly arranged scuba equipment beside a dive boat with a calm briefing vibe",
        timeOfDay: "soft_overcast",
        desiredComposition: "centred",
        exclusions: ["generated price text", "fake discount stickers"],
      });
    }
    if (/spot|site|location|where to|vagator|calangute|anjuna|palolem/.test(t)) {
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
      visualIntent: "authentic scuba experience",
      mainSubject:
        "Two divers exploring a reef with natural light, correct gear and realistic proportions",
      timeOfDay: "underwater_rays",
      desiredComposition: "depth_layers",
      safetyEquipment: ["BCD", "regulator", "mask", "fins"],
      exclusions: ["fantasy creatures", "unsafe diving behaviour"],
    });
  }

  if (/beach|shore|coast/.test(t)) {
    return pick("beach_guide", {
      visualIntent: "beach travel guide",
      mainSubject: "Scenic Goa beach with clear water and natural coastal atmosphere",
      timeOfDay: "golden_hour",
      desiredComposition: "environment_dominant",
    });
  }

  if (/book|booking|reserve|deposit/.test(t)) {
    return pick("booking_guide", {
      visualIntent: "friendly booking / trip planning atmosphere",
      mainSubject:
        "Travellers speaking with a local adventure desk near a boat and coastal backdrop",
      timeOfDay: "clear_morning",
      desiredComposition: "subject_right",
      exclusions: ["fake UI screenshots", "price text overlay"],
    });
  }

  if (/price|cost|compare|vs\b/.test(t)) {
    return pick("price_comparison", {
      visualIntent: "activity comparison without on-image prices",
      mainSubject: "Side-by-side beach activity preparation without any readable price text",
      timeOfDay: "soft_overcast",
      desiredComposition: "multi_subject",
    });
  }

  if (/safety|tip|guide/.test(t) && !/scuba|diving/.test(t)) {
    return pick("safety_guide", {
      visualIntent: "general travel safety",
      mainSubject: "Guide briefing travellers on safe coastal activity with life jackets visible",
      safetyEquipment: ["life jackets"],
      timeOfDay: "clear_morning",
      desiredComposition: "centred",
    });
  }

  return pick("general_travel", {
    visualIntent: "Goa travel editorial",
    mainSubject: "Authentic Goa coastal travel scene matching the article topic",
    timeOfDay: "golden_hour",
    desiredComposition: "environment_dominant",
    exclusions: ["generic stock scuba diver as default subject"],
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
