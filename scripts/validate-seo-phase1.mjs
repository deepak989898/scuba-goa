/**
 * Validates Phase 1 SEO redirect map (no chains, no loops).
 * Run: node scripts/validate-seo-phase1.mjs
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const redirectsPath = join(
  root,
  "src/lib/seo-cannibalization/redirects.ts",
);
const raw = readFileSync(redirectsPath, "utf8");

const pairs = [];
const re = /source:\s*"([^"]+)"[\s\S]*?destination:\s*"([^"]+)"/g;
let m;
while ((m = re.exec(raw))) {
  pairs.push({ source: m[1], destination: m[2] });
}

const map = new Map(pairs.map((p) => [p.source, p.destination]));
const errors = [];

for (const { source, destination } of pairs) {
  if (source === destination) {
    errors.push(`Self redirect: ${source}`);
  }
  let cursor = destination;
  const chain = [source, destination];
  while (map.has(cursor)) {
    cursor = map.get(cursor);
    chain.push(cursor);
    if (chain.length > 5) break;
  }
  if (map.has(destination)) {
    errors.push(`Redirect chain: ${chain.join(" → ")}`);
  }
}

if (errors.length) {
  console.error("SEO Phase 1 redirect validation FAILED:");
  for (const e of errors) console.error(" -", e);
  process.exit(1);
}

console.log(`SEO Phase 1 redirect validation OK (${pairs.length} redirects, no chains)`);
