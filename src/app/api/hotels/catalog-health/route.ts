import { NextResponse } from "next/server";
import { getGoaHotelsCatalogStatus } from "@/lib/goa-hotels/firestore";

/** Public health check — Safar Sathi `goaHotels` full collection read status. */
export async function GET() {
  const status = await getGoaHotelsCatalogStatus();
  return NextResponse.json(status, {
    status: status.configured && status.visibleHotelCount > 0 ? 200 : 503,
  });
}
