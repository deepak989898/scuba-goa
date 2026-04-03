/** sessionStorage payload after Razorpay verify — shown on home success banner */
export const PAYMENT_CONFIRM_SESSION_KEY = "bsg_payment_confirm";

export type PaymentConfirmClient = {
  paymentId: string;
  orderId: string;
  paymentMode: "partial" | "full";
  paidInr: number;
  balanceInr: number;
  fullInr: number;
};

export function storePaymentConfirmation(data: PaymentConfirmClient): void {
  try {
    sessionStorage.setItem(PAYMENT_CONFIRM_SESSION_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

/** After /api/razorpay/verify success — drives the instant confirmation banner */
export function persistPaymentConfirmationFromApi(out: {
  paymentId?: unknown;
  orderId?: unknown;
  paymentMode?: unknown;
  paidInr?: unknown;
  balanceInr?: unknown;
  fullInr?: unknown;
}): void {
  const paymentId = typeof out.paymentId === "string" ? out.paymentId : "";
  const orderId = typeof out.orderId === "string" ? out.orderId : "";
  const mode = out.paymentMode;
  if (
    !paymentId ||
    !orderId ||
    (mode !== "partial" && mode !== "full")
  ) {
    return;
  }
  storePaymentConfirmation({
    paymentId,
    orderId,
    paymentMode: mode,
    paidInr: Number(out.paidInr) || 0,
    balanceInr: Number(out.balanceInr) || 0,
    fullInr: Number(out.fullInr) || 0,
  });
}
