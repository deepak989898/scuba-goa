/** sessionStorage payload after Razorpay verify — shown in payment success dialog */
export const PAYMENT_CONFIRM_SESSION_KEY = "bsg_payment_confirm";

export type PaymentConfirmClient = {
  paymentId: string;
  orderId: string;
  paymentMode: "partial" | "full";
  paidInr: number;
  balanceInr: number;
  fullInr: number;
  packageName?: string;
  invoiceDownloadUrl?: string;
  emailSent?: boolean;
  smsSent?: boolean;
  /** Server queued email/SMS after verify (not finished yet). */
  notificationsQueued?: boolean;
};

export function storePaymentConfirmation(data: PaymentConfirmClient): void {
  try {
    sessionStorage.setItem(PAYMENT_CONFIRM_SESSION_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

/** After /api/razorpay/verify success — drives the payment success dialog */
export function persistPaymentConfirmationFromApi(out: {
  paymentId?: unknown;
  orderId?: unknown;
  paymentMode?: unknown;
  paidInr?: unknown;
  balanceInr?: unknown;
  fullInr?: unknown;
  packageName?: unknown;
  invoiceDownloadUrl?: unknown;
  emailSent?: unknown;
  smsSent?: unknown;
  notificationsQueued?: unknown;
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
    packageName:
      typeof out.packageName === "string" ? out.packageName : undefined,
    invoiceDownloadUrl:
      typeof out.invoiceDownloadUrl === "string"
        ? out.invoiceDownloadUrl
        : undefined,
    emailSent: Boolean(out.emailSent),
    smsSent: Boolean(out.smsSent),
    notificationsQueued: Boolean(out.notificationsQueued),
  });
}
