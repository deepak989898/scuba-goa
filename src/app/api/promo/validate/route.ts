import { NextResponse } from "next/server";
import { resolvePromoPricing } from "@/lib/validate-promo-for-order";
import type { CartItemForPromo } from "@/lib/promo-pricing";

export async function POST(req: Request) {
  let body: {
    promoCode?: string;
    payUnits?: number;
    cartItems?: CartItemForPromo[];
    payMode?: "min" | "full";
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const promoCode = typeof body.promoCode === "string" ? body.promoCode : "";
  const payUnits = Math.max(1, Math.floor(Number(body.payUnits ?? 0)));
  const items = Array.isArray(body.cartItems) ? body.cartItems : [];
  const payMode = body.payMode === "full" ? "full" : "min";

  if (!promoCode.trim()) {
    return NextResponse.json({ error: "Enter a promo code." }, { status: 400 });
  }
  if (payUnits < 1 || items.length === 0) {
    return NextResponse.json(
      { error: "Add items to your cart before validating a promo code." },
      { status: 400 }
    );
  }

  const r = await resolvePromoPricing({
    promoCodeRaw: promoCode,
    cartItems: items,
    payUnits,
  });

  if (!r.ok) {
    return NextResponse.json({ error: r.error }, { status: 400 });
  }

  const payNowPaise =
    payMode === "full" || r.minPayPaise >= r.discountedFullPaise
      ? r.discountedFullPaise
      : r.minPayPaise;

  return NextResponse.json({
    ok: true,
    promoCode: r.offer.promoCode,
    title: r.offer.title,
    discountPercent: r.offer.discountPercent,
    subtotalBeforeDiscountPaise: r.subtotalBeforeDiscountPaise,
    discountedFullPaise: r.discountedFullPaise,
    minPayPaise: r.minPayPaise,
    payNowPaise,
  });
}
