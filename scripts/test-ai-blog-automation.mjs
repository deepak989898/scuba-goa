/**
 * AI Blog Automation unit-style checks (no Jest).
 * Run: node scripts/test-ai-blog-automation.mjs
 */
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function normalizeKeywordKey(raw) {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(the|a|an|in|of|for|to|and)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

assert.equal(
  normalizeKeywordKey("Scuba Diving  Price in Goa!!!"),
  normalizeKeywordKey("scuba diving price in goa"),
);

const types = readFileSync(join(root, "src/lib/seo-blog-center/types.ts"), "utf8");
assert.match(types, /AiBlogGenerationJob/);
assert.match(types, /maxKeywordsPerResearch/);
assert.match(types, /autoPublish:\s*false/);

const ads = readFileSync(
  join(root, "src/lib/seo-blog-center/providers/google-ads.ts"),
  "utf8",
);
assert.match(ads, /isGoogleAdsConfigured/);
assert.match(ads, /configured:\s*false|Not configured|not configured/i);

const orch = readFileSync(
  join(root, "src/lib/seo-blog-center/orchestrate-research.ts"),
  "utf8",
);
assert.match(orch, /Math\.min\(100/);

const score = readFileSync(
  join(root, "src/lib/seo-blog-center/opportunity-score.ts"),
  "utf8",
);
assert.match(score, /cannibalization/);
assert.match(score, /Demand .*\/20/);
assert.match(score, /volume unavailable/);

const cluster = readFileSync(
  join(root, "src/lib/seo-blog-center/cluster-keywords.ts"),
  "utf8",
);
assert.match(cluster, /jaccard|sim >= 0\.55/);
assert.match(cluster, /Different intent/);

const queue = readFileSync(
  join(root, "src/lib/seo-blog-center/generation-queue.ts"),
  "utf8",
);
assert.match(queue, /leaseExpiresAt/);
assert.match(queue, /runTransaction/);

const nav = readFileSync(join(root, "src/components/admin/admin-nav.ts"), "utf8");
assert.match(nav, /AI Blog Automation/);

const page = readFileSync(
  join(root, "src/app/admin/ai-blog-automation/page.tsx"),
  "utf8",
);
assert.match(page, /Approve selected/);

const cronDoc = readFileSync(join(root, "docs/EXTERNAL-CRON-JOBS.md"), "utf8");
assert.match(cronDoc, /ai-blog-generation/);

console.log("OK — AI Blog Automation checks passed");
