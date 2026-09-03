import { NextResponse } from "next/server";
import { listVisibleGoaHotels } from "@/lib/tripjack-hotels/catalog-store";
import { GOA_DISPLAY_NAME } from "@/lib/tripjack-hotels/goa";
import { isHotelsModuleEnabled } from "@/lib/tripjack-hotels/proxy-client";

export async function GET(req: Request) {
  if (!isHotelsModuleEnabled()) {
    return NextResponse.json({ enabled: false, hotels: [] });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 60)));

  const hotels = await listVisibleGoaHotels(limit);
  const filtered = q
    ? hotels.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          (h.locality ?? "").toLowerCase().includes(q),
      )
    : hotels;

  return NextResponse.json({
    enabled: true,
    destination: GOA_DISPLAY_NAME,
    city: "goa",
    hotels: filtered,
    count: filtered.length,
  });
}
