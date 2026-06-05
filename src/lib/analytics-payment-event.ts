import type { PaymentEventType } from "@/lib/ai-analytics/types";

/** Best-effort payment funnel event (204 on failure). */
export function logPaymentEvent(payload: {
  eventType: PaymentEventType;
  amountPaise?: number;
  razorpayOrderId?: string;
  error?: string;
  path?: string;
  phone?: string;
  name?: string;
  email?: string;
}): void {
  if (typeof window === "undefined") return;
  let sessionId = "";
  try {
    sessionId = sessionStorage.getItem("bsg_analytics_sid") ?? "";
  } catch {
    /* ignore */
  }
  void fetch("/api/analytics/payment-event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      sessionId,
      path: payload.path ?? window.location.pathname,
    }),
    keepalive: true,
  }).catch(() => {});
}
