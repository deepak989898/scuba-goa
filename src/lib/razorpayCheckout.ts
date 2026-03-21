/** Razorpay Checkout Web (v1) — attach failure handler; avoids silent failures */

export type PaymentFailedPayload = {
  error?: {
    description?: string;
    code?: string;
    source?: string;
  };
};

export function attachRazorpayPaymentFailed(
  rzp: unknown,
  onFailed: (message: string) => void
): void {
  const r = rzp as { on?: (ev: string, cb: (p: unknown) => void) => void };
  if (typeof r.on !== "function") return;
  r.on("payment.failed", (raw: unknown) => {
    const p = raw as PaymentFailedPayload;
    const msg =
      p?.error?.description ??
      "Payment failed. If you use test keys, pay only with Razorpay test cards (see docs/RAZORPAY-TEST.md).";
    onFailed(msg);
  });
}
