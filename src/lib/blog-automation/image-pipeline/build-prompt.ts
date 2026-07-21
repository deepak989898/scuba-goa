import type { ImageBrief } from "./types";
import { describeComposition } from "./composition-engine";

/** Final OpenAI image prompt — topic-specific, never a generic scuba default. */
export function buildImagePromptFromBrief(brief: ImageBrief): string {
  const mustInclude = brief.mustInclude.filter(Boolean).join("; ");
  const mustAvoid = brief.mustAvoid.filter(Boolean).join("; ");
  const composition = describeComposition(brief);

  return [
    `Create a realistic premium editorial travel photograph for an article titled "${brief.articleTitle}".`,
    `Primary keyword context: ${brief.primaryKeyword || brief.articleTitle}.`,
    `Service context: ${brief.serviceName || "Goa adventures"} (${brief.serviceSlug || "general"}).`,
    `Visual category: ${brief.visualCategory} / ${brief.visualSubcategory}.`,
    `Primary scene: ${brief.scene}.`,
    `Main subject: ${brief.mainSubject}.`,
    `Location context: ${brief.locationContext}.`,
    `Activity: ${brief.activity}.`,
    `People: ${brief.people}.`,
    `Required equipment / safety details: ${brief.requiredEquipment}.`,
    `Composition: ${composition}.`,
    `Camera: ${brief.shotType.replace(/_/g, " ")}, ${brief.cameraAngle.replace(/_/g, " ")}.`,
    `Lighting: ${brief.lighting}.`,
    `Mood: ${brief.mood}. Colour direction: ${brief.colourDirection}.`,
    `Important visible details: ${mustInclude}.`,
    `Uniqueness signature (vary this composition distinctly): ${brief.uniquenessSignature}.`,
    "The scene must look authentic, natural, geographically believable and suitable for a professional Goa travel website.",
    "Use realistic people, correct anatomy, accurate equipment and safe activity behaviour.",
    `Do not include: ${mustAvoid}.`,
    "Landscape 16:9 composition, high visual clarity, no text, no headline, no watermark, no large logo,",
    "no distorted faces, no extra limbs, no duplicated people, no malformed equipment and no unrelated activity.",
    "Do not draw any brand logo or company name — branding is applied separately if needed.",
  ].join(" ");
}

/** Descriptive alt text matching the visual brief (not keyword stuffing). */
export function buildImageAltFromBrief(brief: ImageBrief): string {
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
