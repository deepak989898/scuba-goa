import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { getGoaHotelBooking, updateGoaHotelBooking } from "@/lib/goa-hotels/booking-store";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const booking = await getGoaHotelBooking(decodeURIComponent(id));
  if (!booking) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ booking });
}

export async function POST(req: Request, { params }: Params) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const bookingId = decodeURIComponent(id);

  let body: { action?: string; adminNotes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "mark_confirmed") {
    const booking = await updateGoaHotelBooking(bookingId, {
      status: "confirmed",
      adminNotes: typeof body.adminNotes === "string" ? body.adminNotes.trim() : undefined,
    });
    if (!booking) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, booking });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
