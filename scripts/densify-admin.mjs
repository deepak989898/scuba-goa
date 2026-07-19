/**
 * Densify Tailwind spacing on admin UI files (not login).
 * Run: node scripts/densify-admin.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const roots = [
  path.join(ROOT, "src", "app", "admin"),
  path.join(ROOT, "src", "components", "admin"),
];

const REPLACEMENTS = [
  [/\bmt-16\b/g, "mt-6"],
  [/\bmt-12\b/g, "mt-4"],
  [/\bmt-10\b/g, "mt-4"],
  [/\bmt-8\b/g, "mt-3"],
  [/\bmt-6\b/g, "mt-3"],
  [/\bmb-10\b/g, "mb-4"],
  [/\bmb-8\b/g, "mb-3"],
  [/\bmb-6\b/g, "mb-3"],
  [/\bpt-10\b/g, "pt-4"],
  [/\bpt-8\b/g, "pt-3"],
  [/\bpt-6\b/g, "pt-3"],
  [/\bpb-10\b/g, "pb-4"],
  [/\bpb-8\b/g, "pb-3"],
  [/\bpb-6\b/g, "pb-3"],
  [/\bpy-10\b/g, "py-4"],
  [/\bpy-8\b/g, "py-3"],
  [/\bpy-6\b/g, "py-3"],
  [/\bpx-8\b/g, "px-4"],
  [/\bpx-6\b/g, "px-3"],
  [/\bp-8\b/g, "p-4"],
  [/\bp-6\b/g, "p-3"],
  [/\bp-5\b/g, "p-3"],
  [/\bgap-8\b/g, "gap-3"],
  [/\bgap-6\b/g, "gap-3"],
  [/\bgap-5\b/g, "gap-2.5"],
  [/\bgap-4\b/g, "gap-2.5"],
  [/\bspace-y-8\b/g, "space-y-3"],
  [/\bspace-y-6\b/g, "space-y-3"],
  [/\bspace-y-5\b/g, "space-y-2.5"],
  [/\bspace-y-4\b/g, "space-y-2.5"],
  [/\bmax-h-96\b/g, "max-h-56"],
  [/\bmax-h-80\b/g, "max-h-52"],
  [/\bmax-h-72\b/g, "max-h-48"],
  [/\bmax-h-64\b/g, "max-h-44"],
  [/\btext-3xl\b/g, "text-xl"],
  [/\btext-2xl font-bold\b/g, "text-lg font-bold"],
  [/\bfont-display text-2xl\b/g, "font-display text-lg"],
  [/\bfont-display text-xl\b/g, "font-display text-base"],
  [/\brounded-2xl\b/g, "rounded-xl"],
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "login") continue;
      walk(p, out);
    } else if (/\.(tsx|ts)$/.test(e.name)) {
      out.push(p);
    }
  }
  return out;
}

let filesChanged = 0;
let totalRepls = 0;
const changed = [];

for (const root of roots) {
  for (const file of walk(root)) {
    if (file.includes(`${path.sep}login${path.sep}`)) continue;
    // Don't re-densify shell/nav we already hand-tuned in a conflicting way? OK to apply.
    const original = fs.readFileSync(file, "utf8");
    let src = original;
    let n = 0;
    for (const [re, to] of REPLACEMENTS) {
      src = src.replace(re, () => {
        n += 1;
        return to;
      });
    }
    if (src !== original) {
      fs.writeFileSync(file, src);
      filesChanged += 1;
      totalRepls += n;
      changed.push(`${path.relative(ROOT, file)} (~${n})`);
    }
  }
}

console.log(`Files changed: ${filesChanged}`);
console.log(`Replacements: ${totalRepls}`);
console.log(changed.join("\n"));
