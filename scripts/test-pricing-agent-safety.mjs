/**
 * Lightweight safety-rule checks for the AI Pricing Agent (no test runner required).
 * Run: node scripts/test-pricing-agent-safety.mjs
 */
import assert from "node:assert/strict";

function median(nums) {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function filterValidCompetitorPrices(prices) {
  const cleaned = prices.filter(
    (p) => Number.isFinite(p) && p >= 199 && p <= 100_000 && p !== 1 && p !== 99,
  );
  if (cleaned.length < 2) return cleaned;
  const med = median(cleaned);
  return cleaned.filter((p) => p >= med * 0.45 && p <= med * 2.4);
}

function roundPrice(value, rule) {
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

function applySafetyRules(input) {
  const warnings = [];
  const settings = input.settings;
  const rules = input.rules;

  if (settings.emergencyPause) {
    return {
      ok: false,
      adjustedPrice: input.currentPrice,
      autoApproveEligible: false,
      skipReason: "emergency_pause",
    };
  }

  let price = input.suggestedPrice;
  if (!Number.isFinite(price) || price <= 0) {
    return {
      ok: false,
      adjustedPrice: input.currentPrice,
      autoApproveEligible: false,
      skipReason: "invalid_price",
    };
  }

  const minSources = rules?.minimumSources ?? settings.minimumSources;
  const minConf = rules?.minimumConfidence ?? settings.minimumConfidence;
  if (input.sourceCount < minSources) {
    return {
      ok: false,
      adjustedPrice: input.currentPrice,
      autoApproveEligible: false,
      skipReason: "insufficient_sources",
    };
  }
  if (input.confidence < minConf) {
    warnings.push("Low confidence");
  }

  const maxInc = rules?.maxIncreasePercent ?? settings.maxIncreasePercent;
  const maxDec = rules?.maxDecreasePercent ?? settings.maxDecreasePercent;
  const cur = input.currentPrice;
  const maxUp = cur * (1 + maxInc / 100);
  const maxDown = cur * (1 - maxDec / 100);
  if (price > maxUp) {
    price = maxUp;
    warnings.push("Capped increase");
  }
  if (price < maxDown) {
    price = maxDown;
    warnings.push("Capped decrease");
  }

  const floor = rules?.minimumPrice ?? 0;
  if (floor > 0 && price < floor) price = floor;

  const costFloor = input.costFloorInr ?? null;
  const marginPct = rules?.minimumMarginPercent ?? settings.minimumMarginPercent;
  if (costFloor != null && costFloor > 0 && marginPct > 0) {
    const minSell = costFloor * (1 + marginPct / 100);
    if (price < minSell) {
      price = minSell;
      warnings.push("Raised to margin floor");
    }
  }

  price = roundPrice(price, rules?.roundingRule ?? settings.defaultRoundingRule);

  const confOk = input.confidence >= minConf;
  const autoApproveEligible =
    confOk &&
    input.sourceCount >= minSources &&
    (!settings.allowAutomaticIncrease ? price <= cur : true) &&
    (!settings.allowAutomaticDecrease ? price >= cur : true);

  return {
    ok: true,
    adjustedPrice: price,
    warnings,
    autoApproveEligible,
    skipReason: null,
  };
}

const baseSettings = {
  emergencyPause: false,
  minimumSources: 3,
  minimumConfidence: 75,
  maxIncreasePercent: 10,
  maxDecreasePercent: 10,
  minimumMarginPercent: 15,
  defaultRoundingRule: "nearest_50",
  allowAutomaticIncrease: true,
  allowAutomaticDecrease: true,
};

// Outliers / fake prices
assert.deepEqual(
  filterValidCompetitorPrices([1, 99, 50, 1499, 1599, 1699, 50000]).sort(
    (a, b) => a - b,
  ),
  [1499, 1599, 1699],
);

// Rounding
assert.equal(roundPrice(1475, "nearest_50"), 1500);
assert.equal(roundPrice(1500, "marketing_99"), 1499);

// Insufficient sources
{
  const r = applySafetyRules({
    currentPrice: 1500,
    suggestedPrice: 1600,
    confidence: 90,
    sourceCount: 2,
    settings: baseSettings,
  });
  assert.equal(r.skipReason, "insufficient_sources");
  assert.equal(r.autoApproveEligible, false);
}

// Low confidence blocks auto-approve
{
  const r = applySafetyRules({
    currentPrice: 1500,
    suggestedPrice: 1600,
    confidence: 60,
    sourceCount: 5,
    settings: baseSettings,
  });
  assert.equal(r.ok, true);
  assert.equal(r.autoApproveEligible, false);
}

// Cap weekly increase at 10%
{
  const r = applySafetyRules({
    currentPrice: 1000,
    suggestedPrice: 2000,
    confidence: 90,
    sourceCount: 5,
    settings: baseSettings,
  });
  assert.equal(r.adjustedPrice, 1100);
}

// Emergency pause
{
  const r = applySafetyRules({
    currentPrice: 1500,
    suggestedPrice: 1600,
    confidence: 90,
    sourceCount: 5,
    settings: { ...baseSettings, emergencyPause: true },
  });
  assert.equal(r.skipReason, "emergency_pause");
}

// Invalid price
{
  const r = applySafetyRules({
    currentPrice: 1500,
    suggestedPrice: NaN,
    confidence: 90,
    sourceCount: 5,
    settings: baseSettings,
  });
  assert.equal(r.skipReason, "invalid_price");
}

console.log("pricing-agent safety checks passed");
