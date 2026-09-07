import { NextResponse } from "next/server";
import { getAllPackagesServer } from "@/lib/get-packages-server";
import { getHeroSlidesServer } from "@/lib/get-hero-slides-server";
import { getAllServicesServer } from "@/lib/get-services-server";

export const runtime = "nodejs";

/**
 * Public CMS catalog — server-cached Firestore reads.
 * Replaces client-side getDocs() on every homepage visit (major read saver).
 */
export async function GET() {
  const [services, packages, heroSlides] = await Promise.all([
    getAllServicesServer(),
    getAllPackagesServer(),
    getHeroSlidesServer(),
  ]);

  return NextResponse.json(
    {
      services,
      packages,
      heroSlides,
      fromFirestore: true,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
      },
    },
  );
}
