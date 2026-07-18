/**
 * Smoke checks for evidence-based AI analytics actions.
 * Run: node scripts/test-ai-analytics-insights.mjs
 */
import assert from "node:assert/strict";

function isOffTopicPath(path) {
  const p = path.toLowerCase();
  return p.includes("casino") || p.includes("gambling");
}

function isGenericAction(text) {
  const t = text.toLowerCase();
  const genericPhrases = [
    "improve website content",
    "better engagement",
    "promote top pages on social",
    "limited-time discount",
    "encourage bookings",
  ];
  if (genericPhrases.some((p) => t.includes(p))) return true;
  const hasPath = t.includes("/") || t.includes("homepage") || t.includes("whatsapp");
  const hasNumber = /\d/.test(t);
  return !hasPath && !hasNumber && t.length < 80;
}

function preferSpecificActions(aiActions, evidenceActions) {
  const cleaned = aiActions.map((a) => a.trim()).filter(Boolean);
  const specific = cleaned.filter((a) => !isGenericAction(a));
  if (specific.length >= 3) return specific.slice(0, 3);
  const merged = [...specific];
  for (const e of evidenceActions) {
    if (merged.length >= 3) break;
    if (!merged.some((m) => m.slice(0, 40) === e.slice(0, 40))) merged.push(e);
  }
  return merged.slice(0, 3);
}

assert.equal(isOffTopicPath("/blog/casino-bookings-in-goa-complete-guide-prices-tips"), true);
assert.equal(isGenericAction("Improve website content for better engagement."), true);
assert.equal(
  isGenericAction(
    "Homepage exits: 14 — one primary Book Now CTA and clearer first-screen value.",
  ),
  false,
);

const replaced = preferSpecificActions(
  [
    "Improve website content for better engagement.",
    "Promote top pages on social media.",
    "Offer a limited-time discount to encourage bookings.",
  ],
  [
    "Fix top exit /blog/casino… (18 leaves): add scuba booking box.",
    "Service page /services/north-goa-tour has 14 exits — put price + Book Now up top.",
    "Bounce is 86% — speed up homepage first screen.",
  ],
);

assert.equal(replaced.length, 3);
assert.ok(replaced[0].includes("exit") || replaced[0].includes("/"));
assert.ok(!isGenericAction(replaced[0]));

console.log("ai-analytics insights checks passed");
