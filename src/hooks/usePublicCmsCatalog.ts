"use client";

import { cachedCmsFetch } from "@/lib/cms-client-cache";
import type { HeroSlide } from "@/lib/hero-slides-default";
import type { GoaHotelDoc } from "@/lib/goa-hotels/types";
import type { PackageDoc } from "@/lib/types";
import type { ServiceItem } from "@/data/services";

export type PublicCmsCatalog = {
  services: ServiceItem[];
  packages: PackageDoc[];
  heroSlides: HeroSlide[];
  hotelsPreview?: GoaHotelDoc[];
  fromFirestore: boolean;
};

async function fetchPublicCmsCatalog(): Promise<PublicCmsCatalog> {
  const res = await fetch("/api/public/cms-catalog");
  if (!res.ok) {
    throw new Error(`cms-catalog ${res.status}`);
  }
  return (await res.json()) as PublicCmsCatalog;
}

/** One cached HTTP fetch — replaces 3× client Firestore getDocs on homepage. */
export function getPublicCmsCatalogCached(): Promise<PublicCmsCatalog> {
  return cachedCmsFetch("public-cms-catalog-v2", fetchPublicCmsCatalog, 60 * 60 * 1000);
}
