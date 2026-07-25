import sharp from "sharp";
import fs from "fs";
import path from "path";

const outDir = path.join("public", "bill");
fs.mkdirSync(outDir, { recursive: true });

const ref =
  "C:/Users/pc/.cursor/projects/e-Website-ScubaDiving/assets/c__Users_pc_AppData_Roaming_Cursor_User_workspaceStorage_44263251271ab0d52328c041c781a0b6_images_ChatGPT_Image_Jul_25__2026__11_35_53_AM-12b12bc9-f558-49ba-b13d-47393240ba03.png";
const turtleGen =
  "C:/Users/pc/.cursor/projects/e-Website-ScubaDiving/assets/bill-hero-turtle.png";
const vanGen =
  "C:/Users/pc/.cursor/projects/e-Website-ScubaDiving/assets/bill-package-van.png";
const beachGen =
  "C:/Users/pc/.cursor/projects/e-Website-ScubaDiving/assets/bill-footer-beach.png";

async function circlePng(input, size, out) {
  const r = size / 2;
  const svg = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${r}" cy="${r}" r="${r}" fill="white"/></svg>`,
  );
  await sharp(input)
    .resize(size, size, { fit: "cover" })
    .composite([{ input: svg, blend: "dest-in" }])
    .png()
    .toFile(out);
}

async function icon(svg, out, size = 96) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(out);
}

await sharp(ref)
  .extract({ left: 430, top: 18, width: 170, height: 170 })
  .png()
  .toFile(path.join(outDir, "hero-turtle-raw.png"));
await circlePng(
  path.join(outDir, "hero-turtle-raw.png"),
  220,
  path.join(outDir, "hero-turtle.png"),
);

await sharp(ref)
  .extract({ left: 70, top: 400, width: 95, height: 95 })
  .png()
  .toFile(path.join(outDir, "pkg-van-raw.png"));
await circlePng(
  path.join(outDir, "pkg-van-raw.png"),
  160,
  path.join(outDir, "package-van.png"),
);

await sharp(ref)
  .extract({ left: 0, top: 900, width: 724, height: 124 })
  .png()
  .toFile(path.join(outDir, "footer-beach.png"));

await circlePng(turtleGen, 220, path.join(outDir, "hero-turtle-gen.png"));
await circlePng(vanGen, 160, path.join(outDir, "package-van-gen.png"));
await sharp(beachGen)
  .resize(1200, 280, { fit: "cover" })
  .png()
  .toFile(path.join(outDir, "footer-beach-gen.png"));

const blue = "#1E88E5";
await icon(
  `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" fill="none" stroke="${blue}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><path d="M48 10 L78 22 V44c0 20-13 36-30 42C31 80 18 64 18 44V22Z"/><path d="M36 48 l8 8 16-18"/></svg>`,
  path.join(outDir, "icon-shield.png"),
);
await icon(
  `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" fill="none" stroke="${blue}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><circle cx="48" cy="48" r="30"/><path d="M48 34l6 12h12l-10 8 4 12-12-8-12 8 4-12-10-8h12z"/></svg>`,
  path.join(outDir, "icon-badge.png"),
);
await icon(
  `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" fill="none" stroke="${blue}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><path d="M22 58v-8a26 26 0 0152 0v8"/><path d="M18 58h10v16H18a6 6 0 01-6-6v-4a6 6 0 016-6zM78 58H68v16h10a6 6 0 006-6v-4a6 6 0 00-6-6z"/><path d="M48 78v6M38 84h20"/></svg>`,
  path.join(outDir, "icon-headset.png"),
);
await icon(
  `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" fill="none" stroke="${blue}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><path d="M48 14l9 18 20 3-14 14 3 20-18-10-18 10 3-20-14-14 20-3z"/></svg>`,
  path.join(outDir, "icon-star.png"),
);

await icon(
  `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><circle cx="48" cy="48" r="48" fill="#1E88E5"/><circle cx="48" cy="38" r="14" fill="white"/><path d="M20 78c4-16 16-24 28-24s24 8 28 24" fill="white"/></svg>`,
  path.join(outDir, "icon-person.png"),
);
await icon(
  `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><circle cx="48" cy="48" r="48" fill="#22A06B"/><rect x="28" y="40" width="40" height="28" rx="4" fill="white"/><path d="M28 48h40M48 40v28" stroke="#22A06B" stroke-width="4"/><path d="M36 40c0-8 24-8 24 0" stroke="white" stroke-width="5" fill="none"/></svg>`,
  path.join(outDir, "icon-gift.png"),
);
await icon(
  `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><circle cx="48" cy="48" r="48" fill="#1E88E5"/><text x="48" y="62" text-anchor="middle" font-size="36" font-family="Arial" font-weight="700" fill="white">Rs</text></svg>`,
  path.join(outDir, "icon-rupee.png"),
);
await icon(
  `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><circle cx="48" cy="48" r="48" fill="#F59E0B"/><text x="48" y="64" text-anchor="middle" font-size="54" font-family="Arial" font-weight="700" fill="white">!</text></svg>`,
  path.join(outDir, "icon-alert.png"),
);
await icon(
  `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><circle cx="48" cy="48" r="48" fill="#E8F5E9"/><path d="M28 50l12 12 28-28" stroke="#22A06B" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  path.join(outDir, "icon-check.png"),
);
await icon(
  `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><circle cx="48" cy="48" r="48" fill="#FFEBEE"/><path d="M34 34l28 28M62 34L34 62" stroke="#E53935" stroke-width="8" stroke-linecap="round"/></svg>`,
  path.join(outDir, "icon-x.png"),
);
await icon(
  `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><circle cx="48" cy="48" r="48" fill="#E3F2FD"/><path d="M48 22c-12 10-20 22-20 34a20 20 0 0040 0c0-12-8-24-20-34z" fill="#1E88E5"/><circle cx="48" cy="56" r="6" fill="white"/></svg>`,
  path.join(outDir, "icon-pin.png"),
);

const palm = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" fill="none" stroke="#94A3B8" stroke-width="3" opacity="0.4">
  <path d="M200 280 V120"/><path d="M200 130 C160 90 110 80 70 90"/>
  <path d="M200 130 C170 70 140 40 120 20"/><path d="M200 130 C230 70 270 40 300 25"/>
  <path d="M200 130 C250 95 300 90 340 100"/><path d="M200 130 C180 100 150 95 130 110"/>
</svg>`;
await sharp(Buffer.from(palm)).png().toFile(path.join(outDir, "palm-watermark.png"));

fs.unlinkSync(path.join(outDir, "hero-turtle-raw.png"));
fs.unlinkSync(path.join(outDir, "pkg-van-raw.png"));
console.log("assets ready", fs.readdirSync(outDir));
