import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { listGoaHotelBookings } from "@/lib/goa-hotels/booking-store";
import type { GoaHotelBookingStatus } from "@/lib/goa-hotels/types";

export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(req.url);
  const statusRaw = url.searchParams.get("status");
  const status =
    statusRaw &&
    ["paid", "confirmed", "payment_failed", "cancelled"].includes(statusRaw)
      ? (statusRaw as GoaHotelBookingStatus)
      : undefined;

  const bookings = await listGoaHotelBookings({ status, limit: 150 });
  return NextResponse.json({ bookings });
}
