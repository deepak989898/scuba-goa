import { NextResponse } from "next/server";
import { createHotelBooking } from "@/lib/tripjack-hotels/booking-store";
import { assertGoaOnly } from "@/lib/tripjack-hotels/goa";
import {
  isValidEmail,
  isValidPhoneIndia,
} from "@/lib/tripjack-hotels/format";
import type {
  HotelGuestDetails,
  RoomGuestRoom,
} from "@/lib/tripjack-hotels/types";
import { isHotelsModuleEnabled } from "@/lib/tripjack-hotels/proxy-client";

type Body = {
  tjHotelId?: string;
  hotelName?: string;
  locality?: string;
  checkIn?: string;
  checkOut?: string;
  rooms?: number;
  adults?: number;
  children?: number;
  roomName?: string;
  mealBasis?: string;
  totalFare?: number;
  currency?: string;
  guestDetails?: HotelGuestDetails;
  roomGuestRooms?: RoomGuestRoom[];
  tripjackReviewBookingId?: string;
  reviewNormalized?: Record<string, unknown>;
  destination?: string;
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

  const tjHotelId = String(body.tjHotelId ?? "").trim();
  const hotelName = String(body.hotelName ?? "").trim();
  const checkIn = String(body.checkIn ?? "").trim();
  const checkOut = String(body.checkOut ?? "").trim();
  const totalFare = Math.round(Number(body.totalFare));
  const guest = body.guestDetails;

  if (!tjHotelId || !hotelName || !checkIn || !checkOut || !guest) {
    return NextResponse.json({ error: "Missing booking fields" }, { status: 400 });
  }
  if (!Number.isFinite(totalFare) || totalFare < 100) {
    return NextResponse.json({ error: "Invalid total amount" }, { status: 400 });
  }
  if (!isValidEmail(guest.email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }
  if (!isValidPhoneIndia(guest.phone)) {
    return NextResponse.json({ error: "Valid phone required" }, { status: 400 });
  }

  const rooms = Math.max(1, Math.floor(Number(body.rooms) || 1));
  const adults = Math.max(1, Math.floor(Number(body.adults) || 1));
  const children = Math.max(0, Math.floor(Number(body.children) || 0));
  const roomGuestRooms = Array.isArray(body.roomGuestRooms) ? body.roomGuestRooms : [];

  try {
    const booking = await createHotelBooking({
      tjHotelId,
      hotelName,
      locality: body.locality,
      checkIn,
      checkOut,
      rooms,
      adults,
      children,
      roomName: body.roomName,
      mealBasis: body.mealBasis,
      totalFare,
      currency: body.currency ?? "INR",
      guestDetails: guest,
      roomGuestRooms,
      tripjackReviewBookingId: body.tripjackReviewBookingId,
      reviewNormalized: body.reviewNormalized,
      status: "payment_pending",
      paymentStatus: "pending",
    });

    return NextResponse.json({ ok: true, booking });
  } catch (e) {
    console.error("hotel booking create failed", e);
    return NextResponse.json(
      { error: "Could not save booking. Please try again." },
      { status: 500 },
    );
  }
}
