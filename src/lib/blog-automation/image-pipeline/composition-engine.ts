import { createHash } from "crypto";
import type {
  CameraAngle,
  CompositionLayout,
  ImageBrief,
  ShotType,
  TimeOfDay,
  VisualCategory,
  VisualClassification,
} from "./types";
import { lightingForTime } from "./classify-visual";

const CATEGORY_SHOTS: Record<VisualCategory, ShotType[]> = {
  scuba_diving: ["underwater_reef", "split_level", "medium_action", "boat_departure"],
  scuba_safety: ["training_scene", "close_equipment", "over_shoulder", "medium_action"],
  scuba_beginner: ["training_scene", "boat_departure", "over_shoulder", "beach_activity"],
  scuba_pricing: [
    "over_shoulder",
    "close_equipment",
    "training_scene",
    "wide_environmental",
  ],
  scuba_location: [
    "aerial_coastal",
    "boat_departure",
    "split_level",
    "scenic_overview",
    "underwater_reef",
  ],
  destination_comparison: [
    "comparison_diptych",
    "split_level",
    "underwater_reef",
    "medium_action",
  ],
  water_sports: ["beach_activity", "medium_action", "wide_environmental", "aerial_coastal"],
  parasailing: ["medium_action", "wide_environmental", "aerial_coastal"],
  jet_ski: ["medium_action", "beach_activity", "wide_environmental"],
  flyboarding: ["medium_action", "beach_activity", "wide_environmental"],
  bungee: ["medium_action", "wide_environmental", "over_shoulder"],
  dudhsagar: ["scenic_overview", "wide_environmental", "aerial_coastal"],
  north_goa: ["scenic_overview", "aerial_coastal", "wide_environmental"],
  south_goa: ["scenic_overview", "wide_environmental", "aerial_coastal"],
  nightlife: ["nightclub_interior", "wide_environmental", "over_shoulder"],
  night_club: ["nightclub_interior", "wide_environmental"],
  dinner_cruise: ["sunset_cruise", "wide_environmental", "over_shoulder"],
  yacht: ["sunset_cruise", "aerial_coastal", "wide_environmental"],
  beach_guide: ["beach_activity", "scenic_overview", "wide_environmental"],
  family: ["beach_activity", "wide_environmental", "over_shoulder"],
  couples: ["sunset_cruise", "beach_activity", "scenic_overview"],
  travel_tips: ["scenic_overview", "wide_environmental", "over_shoulder"],
  safety_guide: ["training_scene", "close_equipment", "over_shoulder"],
  price_comparison: ["beach_activity", "close_equipment", "wide_environmental"],
  booking_guide: ["over_shoulder", "wide_environmental", "boat_departure"],
  island_guide: ["aerial_coastal", "boat_departure", "scenic_overview", "split_level"],
  general_travel: ["scenic_overview", "wide_environmental", "beach_activity"],
};

const SAFE_SHOTS: ShotType[] = [
  "wide_environmental",
  "aerial_coastal",
  "medium_action",
  "close_equipment",
  "over_shoulder",
  "split_level",
  "boat_departure",
  "training_scene",
  "underwater_reef",
  "beach_activity",
  "nightclub_interior",
  "sunset_cruise",
  "scenic_overview",
  "comparison_diptych",
];

function normalizeShots(list: ShotType[]): ShotType[] {
  const valid = list.filter((s) => SAFE_SHOTS.includes(s));
  return valid.length ? valid : ["wide_environmental"];
}

const ANGLES: CameraAngle[] = [
  "eye_level",
  "low_angle",
  "high_angle",
  "aerial",
  "three_quarter",
  "side_profile",
  "over_shoulder",
  "wide_establishing",
];

const COMPOSITIONS: CompositionLayout[] = [
  "subject_left",
  "subject_right",
  "centred",
  "diagonal_action",
  "depth_layers",
  "multi_subject",
  "environment_dominant",
  "split_comparison",
];

function stableIndex(seed: string, mod: number, salt: number): number {
  const h = createHash("sha256")
    .update(`${seed}::${salt}`)
    .digest();
  return h.readUInt32BE(0) % Math.max(1, mod);
}

function labelShot(s: ShotType): string {
  return s.replace(/_/g, " ");
}

function labelAngle(a: CameraAngle): string {
  return a.replace(/_/g, " ");
}

function labelComp(c: CompositionLayout): string {
  switch (c) {
    case "subject_left":
      return "Main subject left, open space right";
    case "subject_right":
      return "Main subject right, open space left";
    case "centred":
      return "Centred symmetrical composition";
    case "diagonal_action":
      return "Diagonal action lines through the frame";
    case "depth_layers":
      return "Foreground and background depth layers";
    case "multi_subject":
      return "Multi-subject balanced scene";
    case "environment_dominant":
      return "Scenic environment dominant with human activity secondary";
    case "split_comparison":
      return "Clear left/right or diagonal photographic split comparing two destinations or scenes";
    default:
      return c;
  }
}

/**
 * Controlled visual variation — category-safe options only.
 */
export function pickCompositionVariant(
  classification: VisualClassification,
  uniquenessSeed: string,
  attempt: number,
): {
  shotType: ShotType;
  cameraAngle: CameraAngle;
  composition: CompositionLayout;
  timeOfDay: TimeOfDay;
  uniquenessSignature: string;
} {
  const shots = normalizeShots(CATEGORY_SHOTS[classification.visualCategory] || SAFE_SHOTS);
  const shotType = shots[stableIndex(uniquenessSeed, shots.length, attempt + 1)]!;

  let angles = [...ANGLES];
  if (classification.visualCategory === "nightlife") {
    angles = ["eye_level", "wide_establishing", "three_quarter", "over_shoulder"];
  }
  if (classification.visualCategory === "destination_comparison") {
    angles = ["eye_level", "wide_establishing", "three_quarter"];
  }
  if (shotType === "aerial_coastal") {
    angles = ["aerial", "high_angle", "wide_establishing"];
  }
  const cameraAngle = angles[stableIndex(uniquenessSeed, angles.length, attempt + 11)]!;

  let compositions = [...COMPOSITIONS];
  if (classification.desiredComposition) {
    compositions = [
      classification.desiredComposition,
      ...compositions.filter((c) => c !== classification.desiredComposition),
    ];
  }
  if (classification.visualCategory === "destination_comparison") {
    compositions = [
      "split_comparison",
      "multi_subject",
      "diagonal_action",
      "depth_layers",
    ];
  }
  const composition =
    compositions[stableIndex(uniquenessSeed, compositions.length, attempt + 23)]!;

  const timeOfDay = classification.timeOfDay;
  // Include a hash of the main subject so similar categories still get unique signatures
  const subjectToken = classification.mainSubject
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24);
  const uniquenessSignature = [
    classification.visualCategory,
    subjectToken,
    shotType,
    cameraAngle,
    composition,
    timeOfDay,
    `a${attempt}`,
  ].join("|");

  return { shotType, cameraAngle, composition, timeOfDay, uniquenessSignature };
}

export function buildImageBrief(input: {
  articleTitle: string;
  primaryKeyword: string;
  serviceName: string;
  serviceSlug: string;
  classification: VisualClassification;
  attempt?: number;
}): ImageBrief {
  const attempt = input.attempt ?? 1;
  const seed = [
    input.articleTitle,
    input.primaryKeyword,
    input.serviceSlug,
    input.classification.visualCategory,
  ].join("||");

  const variant = pickCompositionVariant(input.classification, seed, attempt);
  const c = input.classification;

  const scene = [
    c.mainSubject,
    c.supportingSubjects.length
      ? `with ${c.supportingSubjects.join(", ")}`
      : "",
    `in ${c.location}`,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    articleTitle: input.articleTitle,
    primaryKeyword: input.primaryKeyword,
    serviceName: input.serviceName,
    serviceSlug: input.serviceSlug,
    visualCategory: c.visualCategory,
    visualSubcategory: c.visualSubcategory,
    visualIntent: c.visualIntent,
    mainSubject: c.mainSubject,
    locationContext: c.location,
    scene,
    cameraAngle: variant.cameraAngle,
    shotType: variant.shotType,
    composition: variant.composition,
    timeOfDay: variant.timeOfDay,
    lighting: lightingForTime(variant.timeOfDay),
    people: c.peopleCount,
    activity: c.visualIntent,
    requiredEquipment: c.safetyEquipment.join(", ") || "appropriate safety gear for the activity",
    backgroundElements: c.supportingSubjects,
    mood: c.isScubaVisual
      ? "calm professional adventure"
      : c.visualCategory === "nightlife"
        ? "premium evening energy"
        : c.visualCategory === "destination_comparison"
          ? "clear comparative storytelling"
          : "authentic Goa travel",
    colourDirection: c.visualCategory === "nightlife"
      ? "deep blues, magentas, warm spotlights"
      : c.visualCategory === "destination_comparison"
        ? "balanced natural colour on both halves, distinct environments"
        : "natural coastal blues, sand tones, realistic skin tones",
    mustInclude: [
      c.mainSubject,
      ...c.safetyEquipment.slice(0, 3),
      c.visualCategory === "destination_comparison"
        ? "two clearly different destination halves in one frame"
        : c.visualCategory === "scuba_pricing"
          ? "clear booking/package-choice storytelling (desk, folders, or tier comparison) — not only tanks on sand"
          : "geographically believable context matching the article title",
    ].filter(Boolean),
    mustAvoid: c.exclusions,
    uniquenessSignature: variant.uniquenessSignature,
    attempt,
  };
}

export function describeComposition(brief: ImageBrief): string {
  return `${labelShot(brief.shotType)}; ${labelAngle(brief.cameraAngle)}; ${labelComp(brief.composition)}`;
}
