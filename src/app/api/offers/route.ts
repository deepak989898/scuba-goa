import { NextResponse } from "next/server";
import { fetchActiveOffersPublic } from "@/lib/server-offers";

/** Public list of active promo offers (no secrets). */
export async function GET() {
  try {
    const offers = await fetchActiveOffersPublic();
    return NextResponse.json({ offers });
  } catch {
    return NextResponse.json({ offers: [] });
  }
}
