import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { getGoaHotelBySlug, findHotelRoom } from "@/lib/goa-hotels/firestore";
import { computeRoomStayTotalInr, countHotelNights } from "@/lib/goa-hotels/pricing";

type Body = {
  hotelSlug?: string;
  roomId?: string;
  checkIn?: string;
  checkOut?: string;
  adults?: number;
  children?: number;
};

export async function POST(req: Request) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const publicKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  if (!keyId || !keySecret) {
    return NextResponse.json({ error: "Razorpay not configured" }, { status: 500 });
  }
  if (publicKeyId && publicKeyId !== keyId) {
    return NextResponse.json(
      { error: "Razorpay key mismatch — fix Vercel env" },
      { status: 400 },
    );
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const hotelSlug = String(body.hotelSlug ?? "").trim();
  const roomId = String(body.roomId ?? "").trim();
  const checkIn = String(body.checkIn ?? "").trim();
  const checkOut = String(body.checkOut ?? "").trim();
  const adults = Math.max(1, Math.floor(Number(body.adults) || 1));
  const children = Math.max(0, Math.floor(Number(body.children) || 0));

  if (!hotelSlug || !roomId || !checkIn || !checkOut) {
    return NextResponse.json({ error: "Missing booking fields" }, { status: 400 });
  }

  const nights = countHotelNights(checkIn, checkOut);
  if (nights < 1) {
    return NextResponse.json({ error: "Invalid stay dates" }, { status: 400 });
  }

  const hotel = await getGoaHotelBySlug(hotelSlug);
  if (!hotel) {
    return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
  }

  const room = findHotelRoom(hotel, roomId);
  if (!room || !room.available) {
    return NextResponse.json({ error: "Room not available" }, { status: 400 });
  }

  if (room.maxGuests > 0 && adults + children > room.maxGuests) {
    return NextResponse.json(
      { error: `This room allows up to ${room.maxGuests} guests` },
      { status: 400 },
    );
  }

  const totalInr = computeRoomStayTotalInr(room.pricePerNight, nights);
  if (totalInr < 100) {
    return NextResponse.json(
      { error: "Rates are updating for this room — please try again later or contact us." },
      { status: 400 },
    );
  }

  const amountPaise = totalInr * 100;
  const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
  const receipt = `hotel_${Date.now()}`.slice(0, 40);

  try {
    const order = await rzp.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt,
      notes: {
        type: "goa_hotel",
        hotelSlug,
        roomId,
        checkIn,
        checkOut,
      },
    });

    return NextResponse.json({
      orderId: order.id,
      amountPaise,
      totalAmountInr: totalInr,
      nights,
      currency: "INR",
      hotelName: hotel.name,
      roomName: room.name,
    });
  } catch (e) {
    console.error("[hotels] create-order", e);
    return NextResponse.json({ error: "Could not create payment order" }, { status: 500 });
  }
}
