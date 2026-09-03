import { NextResponse } from "next/server";
import {
  getCatalogHotel,
  getGoaDestinationHids,
  listVisibleGoaHotels,
  updateCachedPrice,
} from "@/lib/tripjack-hotels/catalog-store";
import { assertGoaOnly } from "@/lib/tripjack-hotels/goa";
import {
  customerSafeHotelError,
  extractMinPriceFromListing,
} from "@/lib/tripjack-hotels/parse-response";
import {
  isHotelsModuleEnabled,
  tripjackProxyPost,
} from "@/lib/tripjack-hotels/proxy-client";
import type { HotelSearchRequest } from "@/lib/tripjack-hotels/types";

type Body = HotelSearchRequest & {
  destination?: string;
  hids?: string[];
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
  const rooms = Math.max(1, Math.floor(Number(body.rooms) || 1));
  const adults = Math.max(1, Math.floor(Number(body.adults) || 1));
  const children = Math.max(0, Math.floor(Number(body.children) || 0));

  if (!checkIn || !checkOut) {
    return NextResponse.json({ error: "Check-in and check-out dates are required." }, { status: 400 });
  }

  let hids = Array.isArray(body.hids) ? body.hids.filter(Boolean) : [];
  if (!hids.length) {
    hids = await getGoaDestinationHids();
  }
  if (!hids.length) {
    const catalog = await listVisibleGoaHotels(80);
    hids = catalog.map((h) => h.tjHotelId);
  }

  const searchPayload = {
    checkIn,
    checkOut,
    rooms,
    adults,
    children,
    childAges: body.childAges,
    destination: "Goa",
    country: "India",
    hids: hids.slice(0, 50),
  };

  let live: Record<string, unknown> | null = null;
  let liveError: string | undefined;
  try {
    live = await tripjackProxyPost("listing", searchPayload);
  } catch (e) {
    liveError = customerSafeHotelError(e);
  }

  const catalog = await listVisibleGoaHotels(100);
  const catalogMap = new Map(catalog.map((h) => [h.tjHotelId, h]));

  const pricedIds = new Set<string>();
  if (live) {
    const minFromLive = extractMinPriceFromListing(live);
    if (Array.isArray((live as { hotels?: unknown[] }).hotels)) {
      for (const row of (live as { hotels: unknown[] }).hotels) {
        if (!row || typeof row !== "object") continue;
        const o = row as Record<string, unknown>;
        const hid = String(o.hid ?? o.hotelId ?? o.id ?? "").trim();
        if (!hid) continue;
        pricedIds.add(hid);
        const price =
          Number(o.minPrice ?? o.priceFrom ?? o.tf ?? o.totalFare) ||
          extractMinPriceFromListing(o);
        if (price && price > 0) {
          await updateCachedPrice(hid, price);
          const cat = catalogMap.get(hid) ?? (await getCatalogHotel(hid));
          if (cat) {
            catalogMap.set(hid, { ...cat, priceFrom: price, cachedPriceUpdatedAt: new Date().toISOString() });
          }
        }
      }
    } else if (minFromLive) {
      /* single aggregate response */
    }
  }

  const hotels = [...catalogMap.values()]
    .filter((h) => h.websiteVisible)
    .map((h) => ({
      ...h,
      priceSource: pricedIds.has(h.tjHotelId) ? "live" : h.priceFrom ? "cached" : "none",
      displayPrice: h.priceFrom,
      priceLabel: h.priceFrom ? "incl. taxes" : undefined,
    }))
    .sort((a, b) => (a.priceFrom ?? 9999999) - (b.priceFrom ?? 9999999));

  return NextResponse.json({
    destination: "Goa, India",
    checkIn,
    checkOut,
    rooms,
    adults,
    children,
    hotels,
    liveAvailable: Boolean(live),
    liveError,
    cachedFallback: Boolean(liveError),
  });
}
