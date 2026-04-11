import { computeMinPayPaise } from "@/lib/payment";

export type CartItemForPromo = {
  unitPrice: number;
  quantity: number;
};

/** Normalize promo code for storage and lookup (uppercase, no spaces). */
export function normalizePromoCode(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

/** Subtotal in paise from cart lines (unit prices in INR). Returns -1 if invalid. */
export function cartSubtotalPaiseFromItems(items: CartItemForPromo[]): number {
  if (!Array.isArray(items) || items.length === 0) return -1;
  let sum = 0;
  for (const it of items) {
    const q = Math.max(0, Math.floor(Number(it.quantity)));
    const unit = Number(it.unitPrice);
    if (!Number.isFinite(unit) || unit < 0 || q < 1) return -1;
    sum += Math.round(unit * 100) * q;
  }
  return sum;
}

export function applyPercentDiscountSubtotalPaise(
  subtotalPaise: number,
  discountPercent: number
): number {
  const pct = Math.floor(Number(discountPercent));
  if (!Number.isFinite(pct) || pct < 1 || pct > 50) return -1;
  const base = Math.floor(subtotalPaise);
  if (base < 100) return -1;
  const out = Math.floor((base * (100 - pct)) / 100);
  return Math.max(100, out);
}

export type OfferRuleFields = {
  discountPercent: number;
  minCartUnits?: number;
  maxCartUnits?: number | null;
  active?: boolean;
};

export function offerAppliesToCartUnits(
  offer: OfferRuleFields,
  payUnits: number
): boolean {
  if (offer.active === false) return false;
  const u = Math.max(1, Math.floor(payUnits));
  const min = Math.max(1, Math.floor(Number(offer.minCartUnits ?? 1)));
  const maxRaw = offer.maxCartUnits;
  if (u < min) return false;
  if (maxRaw != null && Number.isFinite(Number(maxRaw))) {
    const max = Math.floor(Number(maxRaw));
    if (u > max) return false;
  }
  return true;
}

export function computePromoPricing(args: {
  subtotalBeforeDiscountPaise: number;
  discountPercent: number;
  payUnits: number;
}): { discountedFullPaise: number; minPayPaise: number } | null {
  const discounted = applyPercentDiscountSubtotalPaise(
    args.subtotalBeforeDiscountPaise,
    args.discountPercent
  );
  if (discounted < 0) return null;
  const minPay = computeMinPayPaise(args.payUnits, discounted);
  return { discountedFullPaise: discounted, minPayPaise: minPay };
}
