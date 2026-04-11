import {
  cartSubtotalPaiseFromItems,
  computePromoPricing,
  normalizePromoCode,
  offerAppliesToCartUnits,
  type CartItemForPromo,
} from "@/lib/promo-pricing";
import { isValidPayAmountPaise } from "@/lib/payment";
import { getAdminDb } from "@/lib/firebase-admin";
import { fetchActiveOfferByPromoCode } from "@/lib/server-offers";
import type { OfferDoc } from "@/lib/types";

export type PromoOrderOk = {
  ok: true;
  offer: OfferDoc;
  subtotalBeforeDiscountPaise: number;
  discountedFullPaise: number;
  minPayPaise: number;
};

export type PromoOrderFail = { ok: false; error: string };

/**
 * Resolves promo + cart to discounted totals (no claimed-amount checks).
 * Used by /api/promo/validate and Razorpay routes.
 */
export async function resolvePromoPricing(args: {
  promoCodeRaw: string;
  cartItems: CartItemForPromo[] | undefined;
  payUnits: number;
}): Promise<PromoOrderOk | PromoOrderFail> {
  if (!getAdminDb()) {
    return {
      ok: false,
      error:
        "Promo codes are temporarily unavailable. Continue without a code or try again later.",
    };
  }

  const raw = (args.promoCodeRaw ?? "").trim();
  if (!raw) {
    return { ok: false, error: "Enter a promo code." };
  }

  const code = normalizePromoCode(raw);
  if (!code || code.length > 32) {
    return { ok: false, error: "Invalid promo code." };
  }

  const items = args.cartItems;
  if (!Array.isArray(items) || items.length === 0) {
    return {
      ok: false,
      error: "Add items to your cart before applying a promo code.",
    };
  }

  const subtotal = cartSubtotalPaiseFromItems(items);
  if (subtotal < 0) {
    return { ok: false, error: "Invalid cart for promo validation." };
  }

  const offer = await fetchActiveOfferByPromoCode(code);
  if (!offer) {
    return { ok: false, error: "This promo code is not valid or has expired." };
  }

  const payUnits = Math.max(1, Math.floor(Number(args.payUnits)));
  if (!offerAppliesToCartUnits(offer, payUnits)) {
    return {
      ok: false,
      error: `This code does not apply to your cart size (${payUnits} people / units).`,
    };
  }

  const pct = Math.floor(Number(offer.discountPercent));
  if (!Number.isFinite(pct) || pct < 1 || pct > 50) {
    return { ok: false, error: "This offer is misconfigured. Contact support." };
  }

  const priced = computePromoPricing({
    subtotalBeforeDiscountPaise: subtotal,
    discountPercent: pct,
    payUnits,
  });
  if (!priced) {
    return { ok: false, error: "Could not apply this discount to your cart." };
  }

  const { discountedFullPaise, minPayPaise } = priced;

  return {
    ok: true,
    offer,
    subtotalBeforeDiscountPaise: subtotal,
    discountedFullPaise,
    minPayPaise,
  };
}

/**
 * Validates claimed Razorpay amounts against resolved promo pricing.
 */
export async function validatePromoForOrder(args: {
  promoCodeRaw: string | undefined;
  cartItems: CartItemForPromo[] | undefined;
  payUnits: number;
  claimedFullAmountPaise: number;
  claimedChargePaise: number;
}): Promise<PromoOrderOk | PromoOrderFail> {
  const raw = (args.promoCodeRaw ?? "").trim();
  if (!raw) {
    return { ok: false, error: "NO_PROMO" };
  }

  const base = await resolvePromoPricing({
    promoCodeRaw: raw,
    cartItems: args.cartItems,
    payUnits: args.payUnits,
  });
  if (!base.ok) return base;

  const claimedFull = Math.floor(Number(args.claimedFullAmountPaise));
  const claimedCharge = Math.floor(Number(args.claimedChargePaise));

  if (!Number.isFinite(claimedFull) || Math.abs(claimedFull - base.discountedFullPaise) > 1) {
    return {
      ok: false,
      error: "Cart total does not match this promo. Remove the code and try again.",
    };
  }

  if (
    !Number.isFinite(claimedCharge) ||
    !isValidPayAmountPaise(claimedCharge, base.discountedFullPaise, args.payUnits)
  ) {
    return {
      ok: false,
      error: "Payment amount is not valid for this promo and cart.",
    };
  }

  return base;
}
