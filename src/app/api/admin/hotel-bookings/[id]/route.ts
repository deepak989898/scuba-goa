import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  getHotelBooking,
  markHotelBookingConfirmed,
} from "@/lib/tripjack-hotels/booking-store";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await ctx.params;
  const booking = await getHotelBooking(String(id ?? "").trim());
  if (!booking) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ booking });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await ctx.params;
  const bookingId = String(id ?? "").trim();
  if (!bookingId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  let body: {
    action?: string;
    supplierConfirmation?: string;
    adminNotes?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action !== "mark_confirmed") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const existing = await getHotelBooking(bookingId);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await markHotelBookingConfirmed(
    bookingId,
    body.supplierConfirmation,
    body.adminNotes,
  );

  const booking = await getHotelBooking(bookingId);
  return NextResponse.json({ ok: true, booking });
}
