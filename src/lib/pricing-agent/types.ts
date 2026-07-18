/** AI Pricing Agent — types for market research & approval workflow. */

export type PricingTargetKind = "package" | "service";

export type PricingRoundingRule =
  | "nearest_1"
  | "nearest_10"
  | "nearest_50"
  | "nearest_99"
  | "marketing_99";

export type AutoApprovalMode = "global" | "enabled" | "manual";

export type PricingSuggestionStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "auto_approved"
  | "skipped"
  | "kept";

export type PricingRunStatus =
  | "running"
  | "success"
  | "partial"
  | "error"
  | "cancelled";

export type PricingRunType = "weekly" | "manual" | "dry_run";

export type PricingSettings = {
  autoApproveEnabled: boolean;
  scheduleEnabled: boolean;
  timezone: "Asia/Kolkata";
  scheduleDay: "tuesday";
  scheduleTimeIst: "06:00";
  minimumSources: number;
  minimumConfidence: number;
  maxIncreasePercent: number;
  maxDecreasePercent: number;
  minimumMarginPercent: number;
  defaultRoundingRule: PricingRoundingRule;
  allowAutomaticIncrease: boolean;
  allowAutomaticDecrease: boolean;
  emergencyPause: boolean;
  weekendMarkupPercent: number;
  seasonalMarkupPercent: number;
  monsoonDiscountPercent: number;
  maxSourcesPerTarget: number;
  monthlyBudgetInr: number;
  notifyOnComplete: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  updatedAt: string;
  updatedBy: string | null;
};

export const DEFAULT_PRICING_SETTINGS: PricingSettings = {
  autoApproveEnabled: false,
  scheduleEnabled: true,
  timezone: "Asia/Kolkata",
  scheduleDay: "tuesday",
  scheduleTimeIst: "06:00",
  minimumSources: 3,
  minimumConfidence: 75,
  maxIncreasePercent: 10,
  maxDecreasePercent: 10,
  minimumMarginPercent: 15,
  defaultRoundingRule: "nearest_50",
  allowAutomaticIncrease: true,
  allowAutomaticDecrease: true,
  emergencyPause: false,
  weekendMarkupPercent: 0,
  seasonalMarkupPercent: 0,
  monsoonDiscountPercent: 0,
  maxSourcesPerTarget: 8,
  monthlyBudgetInr: 2000,
  notifyOnComplete: true,
  lastRunAt: null,
  nextRunAt: null,
  updatedAt: new Date(0).toISOString(),
  updatedBy: null,
};

export type PackagePricingRules = {
  targetId: string;
  kind: PricingTargetKind;
  autoApprovalMode: AutoApprovalMode;
  minimumPrice: number | null;
  maximumPrice: number | null;
  minimumMarginPercent: number | null;
  maxIncreasePercent: number | null;
  maxDecreasePercent: number | null;
  roundingRule: PricingRoundingRule | null;
  costFloorInr: number | null;
  disabled: boolean;
  updatedAt: string;
};

export type PricingTarget = {
  id: string;
  kind: PricingTargetKind;
  name: string;
  category: string;
  locationHint: string;
  duration: string;
  includes: string[];
  currentPrice: number;
  imageUrl: string;
  active: boolean;
};

export type CompetitorPriceSnapshot = {
  id: string;
  suggestionId: string;
  targetId: string;
  providerName: string;
  packageTitle: string;
  price: number;
  originalPrice: number | null;
  priceType: "per_person" | "per_couple" | "per_group" | "per_boat" | "unknown";
  location: string;
  duration: string;
  inclusions: string[];
  sourceUrl: string;
  similarityScore: number;
  reliabilityScore: number;
  snippet: string;
  checkedAt: string;
};

export type PricingSuggestion = {
  id: string;
  runId: string;
  targetId: string;
  kind: PricingTargetKind;
  name: string;
  category: string;
  imageUrl: string;
  currentPrice: number;
  suggestedPrice: number;
  marketMinimum: number;
  marketMedian: number;
  marketMaximum: number;
  weightedMarketPrice: number;
  differenceAmount: number;
  differencePercent: number;
  confidenceScore: number;
  sourceCount: number;
  recommendation: "increase" | "decrease" | "keep" | "insufficient_data";
  reason: string;
  warnings: string[];
  riskWarnings: string[];
  autoApproveEligible: boolean;
  autoApproved: boolean;
  status: PricingSuggestionStatus;
  skipReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  expiresAt: string;
};

export type PricingRun = {
  id: string;
  runType: PricingRunType;
  status: PricingRunStatus;
  startedAt: string;
  completedAt: string | null;
  triggeredBy: string;
  totalTargets: number;
  successfulTargets: number;
  failedTargets: number;
  skippedTargets: number;
  suggestionsCreated: number;
  pricesUpdated: number;
  dryRun: boolean;
  errorSummary: string | null;
  logs: string[];
};

export type PackagePriceHistory = {
  id: string;
  targetId: string;
  kind: PricingTargetKind;
  oldPrice: number;
  newPrice: number;
  differenceAmount: number;
  differencePercent: number;
  changeSource: "ai_approve" | "ai_auto" | "manual_edit" | "rollback";
  suggestionId: string | null;
  runId: string | null;
  approvedBy: string;
  rollbackOf: string | null;
  reason: string;
  createdAt: string;
};

export type AiPriceRecommendationJson = {
  packageId: string;
  currentPrice: number;
  recommendedPrice: number;
  marketMinimum: number;
  marketMedian: number;
  marketMaximum: number;
  weightedMarketPrice: number;
  confidenceScore: number;
  sourceCount: number;
  recommendation: "increase" | "decrease" | "keep" | "insufficient_data";
  reason: string;
  warnings: string[];
  autoApproveEligible: boolean;
};
