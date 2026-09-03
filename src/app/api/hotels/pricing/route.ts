import { NextResponse } from "next/server";
import { getCatalogHotel, updateCachedPrice } from "@/lib/tripjack-hotels/catalog-store";
import { assertGoaOnly } from "@/lib/tripjack-hotels/goa";
import {
  customerSafeHotelError,
  extractRoomOptionsFromPricing,
} from "@/lib/tripjack-hotels/parse-response";
import {
  isHotelsModuleEnabled,
  tripjackProxyPost,
} from "@/lib/tripjack-hotels/proxy-client";
import type { HotelSearchRequest } from "@/lib/tripjack-hotels/types";

type Body = HotelSearchRequest & {
  hid?: string;
  tjHotelId?: string;
  destination?: string;
};

export async function POST(req: Request) {
  if (!isHotelsModuleEnabled()) {
    return NextResponse.json({ error: "Hotels booking is not available yet." }, { status: 503 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const hid = String(body.hid ?? body.tjHotelId ?? "").trim();
  if (!hid) {
    return NextResponse.json({ error: "Hotel ID required" }, { status: 400 });
  }

  try {
    assertGoaOnly(body.destination);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Goa only" },
      { status: 400 },
    );
  }

  const checkIn = String(body.checkIn ?? "").trim();
  const checkOut = String(body.checkOut ?? "").trim();
  if (!checkIn || !checkOut) {
    return NextResponse.json({ error: "Dates required" }, { status: 400 });
  }

  const payload = {
    hid,
    hotelId: hid,
    checkIn,
    checkOut,
    rooms: Math.max(1, Math.floor(Number(body.rooms) || 1)),
    adults: Math.max(1, Math.floor(Number(body.adults) || 1)),
    children: Math.max(0, Math.floor(Number(body.children) || 0)),
    childAges: body.childAges,
    destination: "Goa",
    country: "India",
  };

  const catalog = await getCatalogHotel(hid);

  let pricing: Record<string, unknown> | null = null;
  let pricingError: string | undefined;
  try {
    pricing = await tripjackProxyPost("pricing", payload);
  } catch (e) {
    pricingError = customerSafeHotelError(e);
  }

  let options = pricing ? extractRoomOptionsFromPricing(pricing) : [];

  if (!options.length && catalog?.priceFrom) {
    options = [
      {
        optionId: `cached_${hid}`,
        roomName: "Standard Room",
        mealBasis: "Room only",
        totalFare: catalog.priceFrom,
        currency: catalog.priceCurrency ?? "INR",
        cancellationText: "Rates from our saved catalog — live refresh unavailable.",
      },
    ];
  }

  if (options.length && options[0].totalFare > 0) {
    await updateCachedPrice(hid, options[0].totalFare, options[0].currency);
  }

  return NextResponse.json({
    hid,
    checkIn,
    checkOut,
    options,
    pricing,
    pricingError,
    cachedFallback: Boolean(pricingError),
    catalog,
  });
}
