import { NextResponse } from "next/server";
import { getCatalogHotel } from "@/lib/tripjack-hotels/catalog-store";
import { assertGoaOnly } from "@/lib/tripjack-hotels/goa";
import { customerSafeHotelError } from "@/lib/tripjack-hotels/parse-response";
import {
  isHotelsModuleEnabled,
  tripjackProxyPost,
} from "@/lib/tripjack-hotels/proxy-client";

export async function POST(req: Request) {
  if (!isHotelsModuleEnabled()) {
    return NextResponse.json({ error: "Hotels booking is not available yet." }, { status: 503 });
  }

  let body: { hid?: string; tjHotelId?: string; destination?: string };
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

  const catalog = await getCatalogHotel(hid);
  if (catalog && !catalog.websiteVisible) {
    return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
  }

  let detail: Record<string, unknown> | null = null;
  let detailError: string | undefined;
  try {
    detail = await tripjackProxyPost("detail", { hid, hotelId: hid });
  } catch (e) {
    detailError = customerSafeHotelError(e);
  }

  return NextResponse.json({
    hid,
    catalog,
    detail,
    detailError,
    cachedFallback: Boolean(detailError && catalog),
  });
}
