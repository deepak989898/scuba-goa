import { NextResponse } from "next/server";
import { listGoaHotels } from "@/lib/goa-hotels/firestore";
import { getHotelDisplayPriceFrom } from "@/lib/goa-hotels/normalize-pricing";
import { getAllPackagesServer } from "@/lib/get-packages-server";
import { getHeroSlidesServer } from "@/lib/get-hero-slides-server";
import { getAllServicesServer } from "@/lib/get-services-server";

export const runtime = "nodejs";

const HOME_HOTELS_PREVIEW = 4;

/**
 * Public CMS catalog — server-cached Firestore reads.
 * Replaces client-side getDocs() on every homepage visit (major read saver).
 */
export async function GET() {
  const [services, packages, heroSlides, allHotels] = await Promise.all([
    getAllServicesServer(),
    getAllPackagesServer(),
    getHeroSlidesServer(),
    listGoaHotels(40),
  ]);

  const pricedFirst = [...allHotels].sort((a, b) => {
    const pa = getHotelDisplayPriceFrom(a) > 0 ? 0 : 1;
    const pb = getHotelDisplayPriceFrom(b) > 0 ? 0 : 1;
    return pa - pb || a.name.localeCompare(b.name);
  });
  const hotelsPreview = pricedFirst.slice(0, HOME_HOTELS_PREVIEW);

  return NextResponse.json(
    {
      services,
      packages,
      heroSlides,
      hotelsPreview,
      fromFirestore: true,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
      },
    },
  );
}
