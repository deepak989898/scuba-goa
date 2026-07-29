/**
 * Lightweight SEO MVP checks (no Jest required).
 * Run: node scripts/test-blog-seo-mvp.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

const redirects = read("src/lib/blog-redirects.ts");
assert.match(
  redirects,
  /top-5-scuba-diving-spots-in-goa-6/,
  "old slug redirect missing",
);
assert.match(
  redirects,
  /destination:\s*"\/blog\/top-5-scuba-diving-spots-in-goa"/,
  "clean slug destination missing",
);
assert.match(redirects, /\/services\/pubs/, "pubs 404 redirect missing");
assert.match(redirects, /\/services\/disco/, "disco 404 redirect missing");

const diving = read("src/data/blog/posts-diving.ts");
assert.match(
  diving,
  /top5ScubaSpotsArticle/,
  "top-5 clean slug must be published as static post",
);

const constants = read("src/lib/constants.ts");
assert.match(
  constants,
  /www\.bookscubagoa\.com/,
  "SITE_URL default must be www (matches Vercel primary host)",
);

const nextConfig = read("next.config.ts");
assert.match(nextConfig, /getAllPermanentRedirects/, "next.config must use redirect map");

const content = read("src/data/blog/top5-scuba-spots-firestore.ts");
assert.match(content, /Quick comparison/, "comparison section missing");
assert.match(content, /Grande Island/, "Grande Island section missing");
assert.match(content, /typically|approximately|may vary/i, "uncertainty wording missing");
assert.doesNotMatch(
  content,
  /slots left|booked today|unforgettable experience/i,
  "must not contain fake scarcity / cliché spam",
);

const page = read("src/app/blog/[slug]/page.tsx");
assert.match(page, /BlogTableOfContents/, "TOC missing");
assert.match(page, /BlogTrustBlock/, "trust block missing");
assert.match(page, /showScarcity=\{false\}/, "scarcity must be off on blog");
assert.match(page, /absolute:\s*title/, "absolute title for metadata");

const sidebar = read("src/components/RelatedServicesSidebar.tsx");
assert.match(sidebar, /showScarcity/, "sidebar scarcity prop missing");

const openai = read("src/lib/blog-automation/openai.ts");
assert.match(openai, /never invent/i, "AI rules must ban invented claims");

console.log("OK — blog SEO MVP checks passed");
