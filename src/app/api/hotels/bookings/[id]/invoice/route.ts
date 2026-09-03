import { NextResponse } from "next/server";
import { getHotelBooking } from "@/lib/tripjack-hotels/booking-store";
import { formatHotelPriceInr } from "@/lib/tripjack-hotels/format";
import { SITE_NAME } from "@/lib/constants";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const booking = await getHotelBooking(String(id ?? "").trim());
  if (!booking) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const lines = [
    `${SITE_NAME} — Hotel payment receipt`,
    `Booking ID: ${booking.bookingId}`,
    `Hotel: ${booking.hotelName}`,
    booking.locality ? `Area: ${booking.locality}, Goa` : "Goa, India",
    `Check-in: ${booking.checkIn}`,
    `Check-out: ${booking.checkOut}`,
    `Room: ${booking.roomName ?? "—"}`,
    booking.mealBasis ? `Meal: ${booking.mealBasis}` : "",
    `Guests: ${booking.adults} adult(s), ${booking.children} child(ren), ${booking.rooms} room(s)`,
    `Guest: ${booking.guestDetails.email} · ${booking.guestDetails.phone}`,
    `Amount paid: ${formatHotelPriceInr(booking.totalFare, booking.currency)}`,
    `Status: ${booking.status}`,
    booking.razorpayPaymentId ? `Razorpay payment: ${booking.razorpayPaymentId}` : "",
    "",
    "Your payment is received. Our team will confirm your hotel booking shortly.",
  ]
    .filter(Boolean)
    .join("\n");

  return new NextResponse(lines, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="hotel-receipt-${booking.bookingId}.txt"`,
    },
  });
}
