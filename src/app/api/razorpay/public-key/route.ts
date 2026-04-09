import { NextResponse } from "next/server";

/**
 * Razorpay Key ID is public by design (used by checkout.js in browser).
 * This route helps recover checkout if NEXT_PUBLIC_RAZORPAY_KEY_ID was not
 * set in the frontend build but server env has RAZORPAY_KEY_ID.
 */
export async function GET() {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? process.env.RAZORPAY_KEY_ID;
  if (!keyId) {
    return NextResponse.json(
      { error: "Razorpay key id not configured on server" },
      { status: 500 }
    );
  }
  return NextResponse.json(
    { keyId },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}

