import { NextResponse } from "next/server";
import { getGoaHotelBooking } from "@/lib/goa-hotels/booking-store";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const bookingId = decodeURIComponent(id).trim();
  if (!bookingId) {
    return NextResponse.json({ error: "Missing booking id" }, { status: 400 });
  }

  const booking = await getGoaHotelBooking(bookingId);
  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  return NextResponse.json({
    booking: {
      bookingId: booking.bookingId,
      hotelName: booking.hotelName,
      hotelSlug: booking.hotelSlug,
      roomName: booking.roomName,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      nights: booking.nights,
      adults: booking.adults,
      children: booking.children,
      guestName: booking.guestName,
      email: booking.email,
      phone: booking.phone,
      totalAmountInr: booking.totalAmountInr,
      status: booking.status,
      createdAt: booking.createdAt,
    },
  });
}
