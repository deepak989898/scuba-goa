import { NextResponse } from "next/server";
import { assertGoaOnly } from "@/lib/tripjack-hotels/goa";
import {
  customerSafeHotelError,
  extractReviewBookingId,
} from "@/lib/tripjack-hotels/parse-response";
import {
  isHotelsModuleEnabled,
  tripjackProxyPost,
} from "@/lib/tripjack-hotels/proxy-client";

export async function POST(req: Request) {
  if (!isHotelsModuleEnabled()) {
    return NextResponse.json({ error: "Hotels booking is not available yet." }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    assertGoaOnly(body.destination as string | undefined);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Goa only" },
      { status: 400 },
    );
  }

  let review: Record<string, unknown> | null = null;
  let reviewError: string | undefined;
  try {
    review = await tripjackProxyPost("review", {
      ...body,
      destination: "Goa",
      country: "India",
    });
  } catch (e) {
    reviewError = customerSafeHotelError(e);
  }

  const reviewBookingId = review ? extractReviewBookingId(review) : undefined;

  return NextResponse.json({
    review,
    reviewBookingId,
    reviewError,
    locked: Boolean(review && !reviewError),
  });
}
