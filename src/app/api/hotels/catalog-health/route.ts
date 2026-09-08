import { NextResponse } from "next/server";
import { getGoaHotelsCatalogStatus } from "@/lib/goa-hotels/firestore";

/** Public health check — is Safar Sathi catalog connected? */
export async function GET() {
  const status = await getGoaHotelsCatalogStatus();
  return NextResponse.json(status, {
    status: status.configured && status.hotelCount > 0 ? 200 : 503,
  });
}
