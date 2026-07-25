import type { ImageBrief } from "./types";
import { describeComposition } from "./composition-engine";

/** Final OpenAI image prompt — title-first, never a generic scuba default. */
export function buildImagePromptFromBrief(brief: ImageBrief): string {
  const mustInclude = brief.mustInclude.filter(Boolean).join("; ");
  const mustAvoid = brief.mustAvoid.filter(Boolean).join("; ");
  const composition = describeComposition(brief);
  const isComparison = brief.visualCategory === "destination_comparison";

  const comparisonBlock = isComparison
    ? [
        "CRITICAL: This article is a DESTINATION COMPARISON.",
        "Compose a single premium photograph as a clear LEFT vs RIGHT (or diagonal) split diptych.",
        "Each half must look like a different destination/environment matching the title — not one generic beach briefing.",
        "Do not put any words, letters, VS badges, ribbons, or website URLs in the image.",
        "The photographic split alone must communicate the comparison.",
      ].join(" ")
    : "";

  const isPricing =
    brief.visualCategory === "scuba_pricing" ||
    brief.visualCategory === "price_comparison" ||
    /price|pricing|cost|budget|package|how much/i.test(brief.articleTitle);

  const pricingBlock = isPricing
    ? [
        "CRITICAL: This article is a PRICE GUIDE / COST / PACKAGES story.",
        "A viewer must understand within one second that people are choosing or comparing dive packages — not just getting ready to dive.",
        "Show a booking desk, package folders/option cards (blank or blurred text only), staff advising guests, or budget-vs-premium gear tiers side by side.",
        "Do NOT make the hero image only tanks lined up on sand with people chatting — that fails to communicate pricing.",
        "Do NOT draw any readable prices, ₹/$ amounts, years (2026), rate tables, or discount stickers.",
      ].join(" ")
    : "";

  return [
    `Create a realistic premium editorial travel photograph that a human would instantly associate with this exact article title: "${brief.articleTitle}".`,
    `Read and obey the title meaning first — do not invent a generic scuba stock scene if the title is about nightlife, water sports, islands, safety, pricing, or destination comparison.`,
    `Primary keyword context: ${brief.primaryKeyword || brief.articleTitle}.`,
    `Service context (secondary only): ${brief.serviceName || "Goa adventures"} (${brief.serviceSlug || "general"}).`,
    `Visual category: ${brief.visualCategory} / ${brief.visualSubcategory}.`,
    `Visual intent: ${brief.visualIntent}.`,
    comparisonBlock,
    pricingBlock,
    `Primary scene: ${brief.scene}.`,
    `Main subject (must dominate the frame): ${brief.mainSubject}.`,
    `Location context: ${brief.locationContext}.`,
    `Activity: ${brief.activity}.`,
    `People: ${brief.people}.`,
    `Required equipment / safety details: ${brief.requiredEquipment}.`,
    `Composition: ${composition}.`,
    `Camera: ${brief.shotType.replace(/_/g, " ")}, ${brief.cameraAngle.replace(/_/g, " ")}.`,
    `Lighting: ${brief.lighting}.`,
    `Mood: ${brief.mood}. Colour direction: ${brief.colourDirection}.`,
    `Important visible details: ${mustInclude}.`,
    `Uniqueness signature — make this frame visually distinct from other blog heroes with signature ${brief.uniquenessSignature} (attempt ${brief.attempt}).`,
    "Vary camera distance, subject pose, foreground props and background so this image does not look like a reused stock scuba diver.",
    "The scene must look authentic, natural, geographically believable and suitable for a professional travel website (bookscubagoa.com).",
    "Use realistic people, correct anatomy, accurate equipment and safe activity behaviour.",
    `Do not include: ${mustAvoid}.`,
    "Landscape 16:9 composition, high visual clarity, no text, no headline, no watermark, no large logo,",
    "no distorted faces, no extra limbs, no duplicated people, no malformed equipment and no unrelated activity.",
    "Do not draw any brand logo or company name — branding is applied separately if needed.",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Descriptive alt text matching the visual brief (not keyword stuffing). */
export function buildImageAltFromBrief(brief: ImageBrief): string {
  if (brief.visualCategory === "destination_comparison") {
    return `${brief.articleTitle} — destination comparison photo`.slice(0, 120);
  }
  const core = brief.mainSubject
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\.$/, "");
  const loc =
    /goa/i.test(core) || /goa/i.test(brief.locationContext)
      ? ""
      : " in Goa";
  const words = `${core}${loc}`.split(/\s+/).filter(Boolean);
  if (words.length > 18) return words.slice(0, 18).join(" ");
  if (words.length < 8) {
    return `${core}${loc} — ${brief.visualIntent}`.slice(0, 120);
  }
  return `${core}${loc}`;
}

export function buildImageTitleFromBrief(brief: ImageBrief): string {
  return `${brief.articleTitle} — featured photo`.slice(0, 120);
}

export function buildImageCaptionFromBrief(brief: ImageBrief): string {
  return `${brief.mainSubject} (${brief.visualCategory.replace(/_/g, " ")})`.slice(
    0,
    160,
  );
}
