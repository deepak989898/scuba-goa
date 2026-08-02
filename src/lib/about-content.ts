import { getAdminDb } from "@/lib/firebase-admin";
import {
  cmsImageOrPlaceholder,
  sanitizePublicImageUrl,
} from "@/lib/cms-image";

export const ABOUT_CONTENT_DOC = "siteContent/about";

export type AboutContent = {
  heroImageUrl: string;
  midImageUrl: string;
};

export async function getAboutContentServer(): Promise<AboutContent> {
  const db = getAdminDb();
  if (!db) {
    return { heroImageUrl: "", midImageUrl: "" };
  }
  try {
    const snap = await db.doc(ABOUT_CONTENT_DOC).get();
    if (!snap.exists) {
      return { heroImageUrl: "", midImageUrl: "" };
    }
    const x = snap.data() as Record<string, unknown>;
    return {
      heroImageUrl: sanitizePublicImageUrl(String(x.heroImageUrl ?? "")),
      midImageUrl: sanitizePublicImageUrl(String(x.midImageUrl ?? "")),
    };
  } catch {
    return { heroImageUrl: "", midImageUrl: "" };
  }
}

export function aboutPublicImages(c: AboutContent): {
  hero: string;
  mid: string;
} {
  return {
    hero: cmsImageOrPlaceholder(c.heroImageUrl),
    mid: cmsImageOrPlaceholder(c.midImageUrl),
  };
}
