import { CONTACT_PHONE_LABEL } from "@/lib/constants";

/** Google-friendly meta description length (chars). */
export const SEO_META_DESCRIPTION_MAX = 160;

const CALL_PREFIX = " Call ";

export function metaDescriptionPhoneSuffix(): string {
  return `${CALL_PREFIX}${CONTACT_PHONE_LABEL}`;
}

/**
 * Append the site contact number to a meta description for SERP snippets.
 * Uses CONTACT_PHONE_LABEL so env / admin deploy updates every page together.
 */
export function buildMetaDescriptionWithContact(
  baseDescription: string,
  maxLength = SEO_META_DESCRIPTION_MAX,
): string {
  const suffix = metaDescriptionPhoneSuffix();
  const base = baseDescription.trim().replace(/\s+/g, " ");
  if (!base) return suffix.trim();

  const maxBase = maxLength - suffix.length;
  if (maxBase < 24) return suffix.trim();

  let truncated = base;
  if (base.length > maxBase) {
    truncated = base.slice(0, maxBase - 1).trimEnd();
    const lastSpace = truncated.lastIndexOf(" ");
    if (lastSpace > Math.floor(maxBase * 0.55)) {
      truncated = truncated.slice(0, lastSpace);
    }
    truncated = truncated.replace(/[,;:\-–—]\s*$/, "") + "…";
  }

  return `${truncated}${suffix}`;
}

/** Split a built meta description into body text and whether the phone suffix is present. */
export function parseMetaDescriptionWithContact(full: string): {
  text: string;
  hasPhoneSuffix: boolean;
} {
  const suffix = metaDescriptionPhoneSuffix();
  const trimmed = full.trim();
  if (trimmed.endsWith(suffix)) {
    return {
      text: trimmed.slice(0, -suffix.length).trimEnd(),
      hasPhoneSuffix: true,
    };
  }
  return { text: trimmed, hasPhoneSuffix: false };
}
