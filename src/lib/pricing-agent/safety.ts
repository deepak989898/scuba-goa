import type {
  PricingRoundingRule,
  PricingSettings,
  PackagePricingRules,
} from "@/lib/pricing-agent/types";

export function roundPrice(value: number, rule: PricingRoundingRule): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  switch (rule) {
    case "nearest_1":
      return Math.round(value);
    case "nearest_10":
      return Math.round(value / 10) * 10;
    case "nearest_50":
      return Math.round(value / 50) * 50;
    case "nearest_99":
      return Math.round(value / 100) * 100 - 1;
    case "marketing_99": {
      const base = Math.round(value / 100) * 100;
      return Math.max(99, base - 1);
    }
    default:
      return Math.round(value / 50) * 50;
  }
}

export function median(nums: number[]): number {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

export function average(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/** Drop deposits, token prices, and extreme outliers vs median. */
export function filterValidCompetitorPrices(prices: number[]): number[] {
  const cleaned = prices.filter(
    (p) => Number.isFinite(p) && p >= 199 && p <= 100_000 && p !== 1 && p !== 99,
  );
  if (cleaned.length < 2) return cleaned;
  const med = median(cleaned);
  return cleaned.filter((p) => p >= med * 0.45 && p <= med * 2.4);
}

export type SafetyCheckResult = {
  ok: boolean;
  adjustedPrice: number;
  warnings: string[];
  autoApproveEligible: boolean;
  skipReason: string | null;
};

export function applySafetyRules(input: {
  currentPrice: number;
  suggestedPrice: number;
  confidence: number;
  sourceCount: number;
  settings: PricingSettings;
  rules?: PackagePricingRules | null;
  costFloorInr?: number | null;
}): SafetyCheckResult {
  const warnings: string[] = [];
  const settings = input.settings;
  const rules = input.rules;

  if (settings.emergencyPause) {
    return {
      ok: false,
      adjustedPrice: input.currentPrice,
      warnings: ["Emergency pricing pause is enabled"],
      autoApproveEligible: false,
      skipReason: "emergency_pause",
    };
  }

  if (rules?.disabled) {
    return {
      ok: false,
      adjustedPrice: input.currentPrice,
      warnings: ["Package-level pricing disabled"],
      autoApproveEligible: false,
      skipReason: "target_disabled",
    };
  }

  let price = input.suggestedPrice;
  if (!Number.isFinite(price) || price <= 0) {
    return {
      ok: false,
      adjustedPrice: input.currentPrice,
      warnings: ["Invalid suggested price"],
      autoApproveEligible: false,
      skipReason: "invalid_price",
    };
  }

  const minSources = settings.minimumSources;
  const minConf = settings.minimumConfidence;
  if (input.sourceCount < minSources) {
    warnings.push(`Fewer than ${minSources} reliable sources`);
  }
  if (input.confidence < minConf) {
    warnings.push(`Confidence below ${minConf}%`);
  }

  const maxInc = rules?.maxIncreasePercent ?? settings.maxIncreasePercent;
  const maxDec = rules?.maxDecreasePercent ?? settings.maxDecreasePercent;
  const current = input.currentPrice;
  const maxUp = current * (1 + maxInc / 100);
  const maxDown = current * (1 - maxDec / 100);
  if (price > maxUp) {
    price = maxUp;
    warnings.push(`Capped to max +${maxInc}% weekly increase`);
  }
  if (price < maxDown) {
    price = maxDown;
    warnings.push(`Capped to max -${maxDec}% weekly decrease`);
  }

  const floor =
    rules?.minimumPrice ??
    rules?.costFloorInr ??
    input.costFloorInr ??
    null;
  if (floor != null && price < floor) {
    price = floor;
    warnings.push(`Raised to minimum floor ₹${floor}`);
  }
  if (rules?.maximumPrice != null && price > rules.maximumPrice) {
    price = rules.maximumPrice;
    warnings.push(`Capped to maximum ₹${rules.maximumPrice}`);
  }

  const marginPct = rules?.minimumMarginPercent ?? settings.minimumMarginPercent;
  const cost = rules?.costFloorInr ?? input.costFloorInr ?? current * 0.5;
  const minByMargin = cost * (1 + marginPct / 100);
  if (price < minByMargin) {
    price = minByMargin;
    warnings.push(`Raised to protect ${marginPct}% margin`);
  }

  const rounding = rules?.roundingRule ?? settings.defaultRoundingRule;
  price = roundPrice(price, rounding);
  if (price <= 0) {
    return {
      ok: false,
      adjustedPrice: current,
      warnings: ["Rounded to invalid price"],
      autoApproveEligible: false,
      skipReason: "invalid_after_round",
    };
  }

  const pct = current > 0 ? ((price - current) / current) * 100 : 0;
  if (pct > 0 && !settings.allowAutomaticIncrease) {
    warnings.push("Automatic increases disabled — manual review required");
  }
  if (pct < 0 && !settings.allowAutomaticDecrease) {
    warnings.push("Automatic decreases disabled — manual review required");
  }

  const insufficient =
    input.sourceCount < minSources || input.confidence < minConf;
  const directionBlocked =
    (pct > 0 && !settings.allowAutomaticIncrease) ||
    (pct < 0 && !settings.allowAutomaticDecrease);

  const autoApproveEligible =
    !insufficient &&
    !directionBlocked &&
    !settings.emergencyPause &&
    Math.abs(pct) <= Math.max(maxInc, maxDec) + 0.01;

  return {
    ok: !insufficient,
    adjustedPrice: Math.round(price),
    warnings,
    autoApproveEligible,
    skipReason: insufficient ? "insufficient_sources_or_confidence" : null,
  };
}
