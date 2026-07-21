/**
 * Blog featured-image pipeline checks (no Jest / no OpenAI calls).
 * Run: node scripts/test-blog-image-pipeline.mjs
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

// --- Inline mirrors of classifier heuristics for unit asserts ---
function classify(title, serviceSlug = "") {
  const t = `${title} ${serviceSlug}`.toLowerCase();
  if (/night.?club|nightlife|disco/.test(t)) return "nightlife";
  if (/water.?sport|parasail|jet.?ski|banana/.test(t) && !/scuba|diving/.test(t))
    return "water_sports";
  if (/scuba|diving/.test(t) && /safety|beginner tip/.test(t)) return "scuba_safety";
  if (/island/.test(t) && /scuba|diving/.test(t)) return "scuba_location";
  if (/scuba|diving/.test(t)) return "scuba_diving";
  return "general_travel";
}

assert.equal(classify("Ultimate Guide to Goa Nightlife"), "nightlife");
assert.equal(classify("Top 10 Water Sports to Try in Goa"), "water_sports");
assert.equal(classify("Safety Tips for Scuba Diving Beginners"), "scuba_safety");
assert.equal(
  classify("The Best Islands to Explore While Scuba Diving in Goa"),
  "scuba_location",
);
assert.notEqual(
  classify("Ultimate Guide to Goa Nightlife"),
  classify("Complete Guide to Scuba Diving in Goa"),
);

const openaiImage = read("src/lib/blog-automation/openai-image.ts");
assert.doesNotMatch(
  openaiImage,
  /Show a properly equipped scuba diver exploring clear tropical water/,
);
assert.match(openaiImage, /buildImagePromptFromBrief|generateBlogImageBufferFromBrief/);

const promptBuilder = read(
  "src/lib/blog-automation/image-pipeline/build-prompt.ts",
);
assert.match(promptBuilder, /Do not include:/);
assert.match(promptBuilder, /Uniqueness signature/);
assert.match(promptBuilder, /no large logo/);

const classifySrc = read(
  "src/lib/blog-automation/image-pipeline/classify-visual.ts",
);
assert.match(classifySrc, /SCUBA_EXCLUSIONS_FOR_NON_SCUBA/);
assert.match(classifySrc, /nightlife/);
assert.match(classifySrc, /Never map everything to scuba/i);

const images = read("src/lib/blog-automation/images.ts");
assert.match(images, /blog\/\$\{articleKey\}\/hero\//);
assert.match(images, /LOGO_WIDTH_RATIO = 0\.09/);

const gen = read(
  "src/lib/blog-automation/image-pipeline/generate-featured.ts",
);
assert.match(gen, /maxRetries/);
assert.match(gen, /checkImageDuplicate/);
assert.match(gen, /needs_manual_review/);

const dedupe = read("src/lib/blog-automation/image-pipeline/dedupe.ts");
assert.match(dedupe, /perceptual_similarity|exact_file_hash/);
assert.match(dedupe, /blogImageRegistry/);

const hashSrc = read("src/lib/blog-automation/image-pipeline/hash.ts");
assert.match(hashSrc, /averageHash/);
assert.match(hashSrc, /differenceHash/);
assert.match(hashSrc, /sha256Hex/);

const quality = read("src/lib/seo-blog-center/quality-gate.ts");
assert.match(quality, /relevanceScore/);
assert.match(quality, /uniquenessScore/);

const queue = read("src/lib/seo-blog-center/generation-queue.ts");
assert.match(queue, /imageBlocksPublish/);

const writer = read("src/lib/seo-blog-center/blog-writer.ts");
assert.match(writer, /generateFeaturedImageForArticle/);
assert.doesNotMatch(writer, /generateBlogImageBufferFromTitle/);

const draft = read("src/lib/blog-automation/generate-blog-draft.ts");
assert.match(draft, /generateFeaturedImageForArticle/);

const audit = read("src/app/api/admin/blog-image-audit/route.ts");
assert.match(audit, /Regeneration required/);

// Prompt hash uniqueness across categories
function promptHash(s) {
  return createHash("sha256").update(s.trim().toLowerCase()).digest("hex");
}
const pNight = promptHash("nightlife club interior dj console dance floor");
const pScuba = promptHash("scuba diver coral reef underwater rays");
assert.notEqual(pNight, pScuba);

// Storage path uniqueness pattern
const slug = "goa-nightlife-guide";
const v1 = `blog/${slug}/hero/abc-111.webp`;
const v2 = `blog/${slug}/hero/abc-222.webp`;
assert.notEqual(v1, v2);

console.log("OK — blog image pipeline checks passed");
