/**
 * Visual taxonomy + structured brief for topic-specific blog hero images.
 */

export type VisualCategory =
  | "scuba_diving"
  | "scuba_safety"
  | "scuba_beginner"
  | "scuba_pricing"
  | "scuba_location"
  | "destination_comparison"
  | "water_sports"
  | "parasailing"
  | "jet_ski"
  | "flyboarding"
  | "bungee"
  | "dudhsagar"
  | "north_goa"
  | "south_goa"
  | "nightlife"
  | "night_club"
  | "casino"
  | "casino_pricing"
  | "dolphin_trip"
  | "dinner_cruise"
  | "yacht"
  | "beach_guide"
  | "family"
  | "couples"
  | "travel_tips"
  | "safety_guide"
  | "price_comparison"
  | "booking_guide"
  | "island_guide"
  | "general_travel";

export type ShotType =
  | "wide_environmental"
  | "aerial_coastal"
  | "medium_action"
  | "close_equipment"
  | "over_shoulder"
  | "split_level"
  | "boat_departure"
  | "training_scene"
  | "underwater_reef"
  | "beach_activity"
  | "nightclub_interior"
  | "sunset_cruise"
  | "scenic_overview"
  | "comparison_diptych";

export type CameraAngle =
  | "eye_level"
  | "low_angle"
  | "high_angle"
  | "aerial"
  | "three_quarter"
  | "side_profile"
  | "over_shoulder"
  | "wide_establishing";

export type CompositionLayout =
  | "subject_left"
  | "subject_right"
  | "centred"
  | "diagonal_action"
  | "depth_layers"
  | "multi_subject"
  | "environment_dominant"
  | "split_comparison";

export type TimeOfDay =
  | "clear_morning"
  | "midday"
  | "golden_hour"
  | "sunset"
  | "blue_hour"
  | "nightclub_lighting"
  | "underwater_rays"
  | "soft_overcast";

export type VisualClassification = {
  visualCategory: VisualCategory;
  visualSubcategory: string;
  visualIntent: string;
  mainSubject: string;
  supportingSubjects: string[];
  location: string;
  timeOfDay: TimeOfDay;
  desiredComposition: CompositionLayout;
  peopleCount: string;
  safetyEquipment: string[];
  exclusions: string[];
  isScubaVisual: boolean;
};

export type ImageBrief = {
  articleTitle: string;
  primaryKeyword: string;
  serviceName: string;
  serviceSlug: string;
  visualCategory: VisualCategory;
  visualSubcategory: string;
  visualIntent: string;
  mainSubject: string;
  locationContext: string;
  scene: string;
  cameraAngle: CameraAngle;
  shotType: ShotType;
  composition: CompositionLayout;
  timeOfDay: TimeOfDay;
  lighting: string;
  people: string;
  activity: string;
  requiredEquipment: string;
  backgroundElements: string[];
  mood: string;
  colourDirection: string;
  mustInclude: string[];
  mustAvoid: string[];
  uniquenessSignature: string;
  attempt: number;
  /** Factual venue/title research for OpenAI prompt. */
  titleResearch?: string;
  researchMainSubjectHint?: string;
};

export type BlogImageMeta = {
  imageUrl: string;
  ogImageUrl: string;
  imageAlt: string;
  imageTitle: string;
  imageCaption: string;
  width: number;
  height: number;
  mimeType: string;
  fileSize: number;
  source: "openai" | "pexels" | "pixabay" | "unsplash" | "upload" | "manual";
  generatedPrompt: string;
  visualCategory: VisualCategory;
  compositionSignature: string;
  generationModel: string;
  createdAt: string;
  sha256: string;
  perceptualHash: string;
  differenceHash: string;
  promptHash: string;
  relevanceScore: number;
  uniquenessScore: number;
  qualityScore: number;
  safetyScore: number;
  overallImageScore: number;
  validationNotes: string[];
  imageStatus: "approved" | "needs_manual_review" | "rejected" | "generated";
  brandingApplied: boolean;
  articleId: string;
  history?: Array<{
    imageUrl: string;
    sha256: string;
    createdAt: string;
    reason?: string;
  }>;
};

export type GenerateFeaturedImageInput = {
  articleId: string;
  slug: string;
  title: string;
  primaryKeyword?: string;
  serviceSlug?: string;
  serviceName?: string;
  contentExcerpt?: string;
  brandingEnabled?: boolean;
  allowPexelsFallback?: boolean;
  maxRetries?: number;
  minRelevanceScore?: number;
  minUniquenessScore?: number;
  minOverallScore?: number;
};

export type GenerateFeaturedImageResult = {
  ok: boolean;
  meta: BlogImageMeta | null;
  error?: string;
  attempts: number;
  blockedPublish: boolean;
};
