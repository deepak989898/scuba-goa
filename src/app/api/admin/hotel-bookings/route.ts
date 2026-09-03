import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { listHotelBookings } from "@/lib/tripjack-hotels/booking-store";
import type { HotelBookingStatus } from "@/lib/tripjack-hotels/types";

export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status") as HotelBookingStatus | null;
  const limit = Number(url.searchParams.get("limit") ?? 100);

  const bookings = await listHotelBookings({
    status: status ?? undefined,
    limit,
  });

  return NextResponse.json({ bookings, count: bookings.length });
}
