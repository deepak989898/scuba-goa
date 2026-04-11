import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import type { CartItemForPromo } from "@/lib/promo-pricing";
import {
  computeMinPayPaise,
  isValidPayAmountPaise,
} from "@/lib/payment";
import { validatePromoForOrder } from "@/lib/validate-promo-for-order";

export async function POST(req: Request) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const publicKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  if (!keyId || !keySecret) {
    return NextResponse.json(
      { error: "Razorpay keys not configured on server" },
      { status: 500 }
    );
  }
  if (publicKeyId && publicKeyId !== keyId) {
    return NextResponse.json(
      {
        error:
          "RAZORPAY_KEY_ID must match NEXT_PUBLIC_RAZORPAY_KEY_ID (same test or live pair). Fix Vercel env.",
      },
      { status: 400 }
    );
  }
  let body: {
    amount?: number;
    currency?: string;
    receipt?: string;
    /** Total for the booking/cart (paise). Required for min vs full checkout. */
    fullAmountPaise?: number;
    /** Cart quantity units for advance minimum (₹199 × units, capped at total). */
    payUnits?: number;
    /** Single optional online promo (validated server-side). */
    promoCode?: string;
    cartItems?: CartItemForPromo[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const amount = Number(body.amount);
  const currency = body.currency ?? "INR";
  const receipt = (body.receipt ?? `rcpt_${Date.now()}`).slice(0, 40);

  if (!Number.isFinite(amount) || amount < 100) {
    return NextResponse.json(
      { error: "Invalid amount (min ₹1)" },
      { status: 400 }
    );
  }

  const fullPaise =
    body.fullAmountPaise !== undefined
      ? Number(body.fullAmountPaise)
      : undefined;
  const payUnits =
    body.payUnits !== undefined ? Math.floor(Number(body.payUnits)) : undefined;
  const promoTrim =
    typeof body.promoCode === "string" ? body.promoCode.trim() : "";
  const cartItems = Array.isArray(body.cartItems)
    ? (body.cartItems as CartItemForPromo[])
    : undefined;

  if (fullPaise !== undefined && payUnits !== undefined) {
    if (!Number.isFinite(fullPaise) || fullPaise < 100 || payUnits < 1) {
      return NextResponse.json(
        { error: "Invalid full amount or pay units" },
        { status: 400 }
      );
    }

    if (promoTrim) {
      const vr = await validatePromoForOrder({
        promoCodeRaw: promoTrim,
        cartItems,
        payUnits,
        claimedFullAmountPaise: fullPaise,
        claimedChargePaise: amount,
      });
      if (!vr.ok) {
        const msg =
          vr.error === "NO_PROMO"
            ? "Invalid promo request."
            : vr.error;
        return NextResponse.json({ error: msg }, { status: 400 });
      }
    } else if (!isValidPayAmountPaise(amount, fullPaise, payUnits)) {
      const minP = computeMinPayPaise(payUnits, fullPaise);
      return NextResponse.json(
        {
          error:
            `Amount must be the minimum advance (₹${(minP / 100).toLocaleString("en-IN")}) or full total (₹${(fullPaise / 100).toLocaleString("en-IN")}).`,
        },
        { status: 400 }
      );
    }
  }

  const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
  try {
    const order = await rzp.orders.create({
      amount,
      currency,
      receipt,
    });
    return NextResponse.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (e: unknown) {
    const err = e as {
      error?: { description?: string };
      message?: string;
    };
    const msg =
      err?.error?.description ?? err?.message ?? "Order creation failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
