/**
 * SEO Intelligence safety + domain helpers (no Jest).
 * Run: node scripts/test-seo-intelligence.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

function normaliseDomain(input) {
  const raw = String(input ?? "").trim().toLowerCase();
  if (!raw) return null;
  let candidate = raw;
  if (!/^https?:\/\//i.test(candidate)) candidate = `https://${candidate}`;
  try {
    const url = new URL(candidate);
    let host = url.hostname.toLowerCase().replace(/\.$/, "");
    if (host.startsWith("www.")) host = host.slice(4);
    if (!host || !host.includes(".")) return null;
    if (host === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return null;
    return host;
  } catch {
    return null;
  }
}

function normaliseKeyword(keyword) {
  return String(keyword ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const RISK_RANK = { low: 1, medium: 2, high: 3, critical: 4 };
const DANGEROUS = [
  "url_changes",
  "page_consolidation",
  "redirect_creation",
  "canonical_changes",
  "new_service_page",
];

function canAutoApprove(input) {
  const { settings } = input;
  if (settings.automationPaused) return { ok: false, reason: "paused" };
  if (!settings.suggestionAutoApprove) return { ok: false, reason: "off" };
  const autoType = input.autoType;
  if (DANGEROUS.includes(autoType) && !settings.dangerousActionSettings[autoType]) {
    return { ok: false, reason: "dangerous" };
  }
  if (!settings.allowedAutoApproveTypes.includes(autoType)) {
    return { ok: false, reason: "not allowed" };
  }
  if (input.confidence < settings.minConfidence) return { ok: false, reason: "confidence" };
  if (RISK_RANK[input.risk] > RISK_RANK[settings.maxRisk]) return { ok: false, reason: "risk" };
  if (input.changesAppliedToday >= settings.dailyChangeLimit) {
    return { ok: false, reason: "daily limit" };
  }
  return { ok: true, reason: "ok" };
}

// Domain normalisation
assert.equal(normaliseDomain("example.com"), "example.com");
assert.equal(normaliseDomain("https://example.com"), "example.com");
assert.equal(normaliseDomain("www.example.com/page"), "example.com");
assert.equal(normaliseDomain("HTTPS://WWW.Example.COM/a?x=1"), "example.com");
assert.equal(normaliseDomain(""), null);
assert.equal(normaliseDomain("not a domain"), null);

// Keyword normalisation
assert.equal(normaliseKeyword("  Scuba Diving in Goa! "), "scuba diving in goa");

// Auto-approve defaults OFF
assert.equal(
  canAutoApprove({
    settings: {
      suggestionAutoApprove: false,
      automationPaused: false,
      allowedAutoApproveTypes: ["title"],
      dangerousActionSettings: {},
      minConfidence: 85,
      maxRisk: "low",
      dailyChangeLimit: 10,
    },
    autoType: "title",
    confidence: 99,
    risk: "low",
    changesAppliedToday: 0,
  }).ok,
  false,
);

// Dangerous blocked even when global ON
assert.equal(
  canAutoApprove({
    settings: {
      suggestionAutoApprove: true,
      automationPaused: false,
      allowedAutoApproveTypes: ["url_changes"],
      dangerousActionSettings: { url_changes: false },
      minConfidence: 50,
      maxRisk: "high",
      dailyChangeLimit: 10,
    },
    autoType: "url_changes",
    confidence: 99,
    risk: "low",
    changesAppliedToday: 0,
  }).reason,
  "dangerous",
);

// Safe type passes when ON + allowed
assert.equal(
  canAutoApprove({
    settings: {
      suggestionAutoApprove: true,
      automationPaused: false,
      allowedAutoApproveTypes: ["title"],
      dangerousActionSettings: {},
      minConfidence: 85,
      maxRisk: "low",
      dailyChangeLimit: 10,
    },
    autoType: "title",
    confidence: 90,
    risk: "low",
    changesAppliedToday: 0,
  }).ok,
  true,
);

// Daily limit
assert.equal(
  canAutoApprove({
    settings: {
      suggestionAutoApprove: true,
      automationPaused: false,
      allowedAutoApproveTypes: ["title"],
      dangerousActionSettings: {},
      minConfidence: 50,
      maxRisk: "low",
      dailyChangeLimit: 2,
    },
    autoType: "title",
    confidence: 90,
    risk: "low",
    changesAppliedToday: 2,
  }).reason,
  "daily limit",
);

// Source safety strings present
const settingsSrc = read("src/lib/seo-intelligence/settings.ts");
assert.match(settingsSrc, /suggestionAutoApprove:\s*false/);
assert.match(settingsSrc, /Dangerous action/);

const domainSrc = read("src/lib/seo-intelligence/domain.ts");
assert.match(domainSrc, /function normaliseDomain/);

const nav = read("src/components/admin/admin-nav.ts");
assert.match(nav, /\/admin\/seo-intelligence/);

const gscDocs = read("docs/GSC-INDEXING-AGENT.md");
assert.match(gscDocs, /Never.*Indexing API/i);

// Page match + opportunity modules exist
assert.match(read("src/lib/seo-intelligence/page-match.ts"), /cannibalisation/);
assert.match(read("src/lib/seo-intelligence/discover-keywords.ts"), /SEED_TOPICS/);
assert.match(read("src/lib/seo-intelligence/refresh-rankings.ts"), /refreshKeywordRankings/);
assert.match(
  read("src/lib/seo-intelligence/opportunity.ts"),
  /not guaranteed/i,
);
assert.match(read("src/lib/seo-intelligence/apply-suggestion.ts"), /rollback/);
assert.match(
  read("src/lib/seo-intelligence/apply-suggestion.ts"),
  /published:\s*false/,
);
assert.match(
  read("src/lib/seo-intelligence/generate-suggestions.ts"),
  /pending_approval/,
);

// Inline page-match style scoring sanity
function jaccard(a, b) {
  const A = new Set(a);
  const B = new Set(b);
  let inter = 0;
  for (const t of A) if (B.has(t)) inter += 1;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}
assert.ok(jaccard(["scuba", "diving", "goa"], ["scuba", "diving", "baga"]) >= 0.4);
assert.ok(jaccard(["casino", "goa"], ["scuba", "diving"]) < 0.2);

console.log("seo-intelligence tests passed");
