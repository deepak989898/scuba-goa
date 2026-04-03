/**
 * Advance booking minimum per cart unit (INR) — each line quantity counts as units.
 * ₹199 × units, capped at cart total (see computeMinPayPaise).
 */
export const MIN_PAYMENT_PER_PERSON_INR = 199;
export const ADVANCE_BOOKING_INR = MIN_PAYMENT_PER_PERSON_INR;
export const MIN_PAYMENT_PER_PERSON_PAISE =
  MIN_PAYMENT_PER_PERSON_INR * 100;

/**
 * Minimum payable for `units` people/items, capped at full order total (paise).
 */
export function computeMinPayPaise(units: number, fullAmountPaise: number): number {
  const u = Math.max(1, Math.floor(units));
  const full = Math.max(0, Math.floor(fullAmountPaise));
  const minByPolicy = u * MIN_PAYMENT_PER_PERSON_PAISE;
  return Math.min(minByPolicy, full);
}

export function isValidPayAmountPaise(
  requestedPaise: number,
  fullAmountPaise: number,
  units: number
): boolean {
  const full = Math.floor(fullAmountPaise);
  const req = Math.floor(requestedPaise);
  const minP = computeMinPayPaise(units, full);
  return req === full || req === minP;
}
