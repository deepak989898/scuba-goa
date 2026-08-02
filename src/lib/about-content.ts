import { getAdminDb } from "@/lib/firebase-admin";
import {
  SITE_IMAGE_PLACEHOLDER,
  cmsImageOrPlaceholder,
  pickCmsImage,
  sanitizePublicImageUrl,
} from "@/lib/cms-image";
import { getAllServicesServer } from "@/lib/get-services-server";

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

export type AboutPublicImages = {
  hero: string;
  mid: string;
  /** True when mid is only the site placeholder (not a real photo). */
  midIsPlaceholder: boolean;
};

/**
 * Resolve About images. Prefer admin About fields, then scuba service photo,
 * then local placeholder (never Unsplash).
 */
export async function getAboutPublicImages(): Promise<AboutPublicImages> {
  const c = await getAboutContentServer();
  let serviceImage = "";
  try {
    const services = await getAllServicesServer();
    const scuba =
      services.find((s) => s.slug === "scuba-diving") ??
      services.find((s) => s.mostBooked) ??
      services[0];
    serviceImage = pickCmsImage(scuba?.image);
  } catch {
    serviceImage = "";
  }

  const hero = cmsImageOrPlaceholder(c.heroImageUrl, serviceImage);
  const midPicked = pickCmsImage(c.midImageUrl, serviceImage);
  const mid = midPicked || SITE_IMAGE_PLACEHOLDER;

  return {
    hero,
    mid,
    midIsPlaceholder: !midPicked,
  };
}

/** @deprecated use getAboutPublicImages */
export function aboutPublicImages(c: AboutContent): {
  hero: string;
  mid: string;
} {
  return {
    hero: cmsImageOrPlaceholder(c.heroImageUrl),
    mid: cmsImageOrPlaceholder(c.midImageUrl),
  };
}
