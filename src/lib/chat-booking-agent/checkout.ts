import { loadRazorpayCheckout } from "@/lib/loadRazorpayCheckout";
import { attachRazorpayPaymentFailed } from "@/lib/razorpayCheckout";
import { persistPaymentConfirmationFromApi } from "@/lib/payment-confirmation";
import { computeMinPayPaise } from "@/lib/payment";
import { SITE_NAME } from "@/lib/constants";
import type { ChatBookingLine } from "./types";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

async function resolveRazorpayKeyId(): Promise<string> {
  const buildKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  if (buildKey) return buildKey;
  const res = await fetch("/api/razorpay/public-key", { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  const keyId = typeof data?.keyId === "string" ? data.keyId.trim() : "";
  if (!res.ok || !keyId) {
    throw new Error(
      data?.error ??
        "Payment setup missing. Please try again or WhatsApp us.",
    );
  }
  return keyId;
}

export type ChatCheckoutInput = {
  lines: ChatBookingLine[];
  customerName: string;
  email: string;
  phone: string;
  date: string;
  pickupLocation?: string;
  payMode: "min" | "full";
};

export type ChatCheckoutResult = {
  paymentId: string;
  orderId: string;
  paidInr: number;
  balanceInr: number;
  fullInr: number;
  packageName: string;
  emailSent: boolean;
  smsSent: boolean;
  invoiceDownloadUrl?: string;
};

export async function runChatBookingCheckout(
  input: ChatCheckoutInput,
): Promise<ChatCheckoutResult> {
  const { lines, customerName, email, phone, date, pickupLocation, payMode } =
    input;
  if (lines.length === 0) throw new Error("No packages selected");

  const itemCount = lines.reduce((s, l) => s + l.quantity, 0);
  const fullAmountPaise = lines.reduce(
    (s, l) => s + Math.round(l.unitPrice * 100) * l.quantity,
    0,
  );
  const minPayPaise = computeMinPayPaise(itemCount, fullAmountPaise);
  const chargePaise =
    payMode === "full" || minPayPaise >= fullAmountPaise
      ? fullAmountPaise
      : minPayPaise;

  const summary = lines
    .map((l) => `${l.name} ×${l.quantity}`)
    .join(", ")
    .slice(0, 200);

  const cartItems = lines.map((l) => ({
    kind: l.kind,
    refId: l.refId,
    name: l.name,
    unitPrice: l.unitPrice,
    quantity: l.quantity,
    lineTotal: l.lineTotal,
  }));

  await loadRazorpayCheckout();
  const Razorpay = window.Razorpay;
  if (!Razorpay) throw new Error("Payment checkout could not start");

  const key = await resolveRazorpayKeyId();
  const orderRes = await fetch("/api/razorpay/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: chargePaise,
      fullAmountPaise,
      payUnits: itemCount,
      currency: "INR",
      receipt: `bk_chat_${Date.now()}`,
    }),
  });
  const orderData = await orderRes.json();
  if (!orderRes.ok) {
    throw new Error(orderData.error ?? "Could not start payment");
  }

  const bookingBase = {
    packageId: "cart",
    packageName: `Cart: ${summary}`,
    customerName,
    email,
    phone,
    date,
    people: itemCount,
    amountPaise: chargePaise,
    fullAmountPaise,
    payUnits: itemCount,
    pickupLocation: pickupLocation?.trim() || undefined,
    cartItems,
  };

  const { logPaymentEvent } = await import("@/lib/analytics-payment-event");

  return new Promise<ChatCheckoutResult>((resolve, reject) => {
    const options: Record<string, unknown> = {
      key,
      amount: orderData.amount,
      currency: orderData.currency,
      order_id: orderData.id,
      name: SITE_NAME,
      description: summary.slice(0, 80) || "Goa experiences",
      prefill: { name: customerName, email, contact: phone },
      modal: {
        ondismiss: () => {
          logPaymentEvent({
            eventType: "checkout_dismissed",
            amountPaise: chargePaise,
            razorpayOrderId: orderData.id,
            phone,
            name: customerName,
            email,
          });
          reject(new Error("Payment cancelled"));
        },
      },
      handler: async (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) => {
        try {
          const v = await fetch("/api/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              booking: bookingBase,
            }),
          });
          const out = await v.json();
          if (!v.ok) {
            logPaymentEvent({
              eventType: "verify_failed",
              amountPaise: chargePaise,
              razorpayOrderId: response.razorpay_order_id,
              error: out.error ?? "Verification failed",
              phone,
              name: customerName,
              email,
            });
            reject(new Error(out.error ?? "Payment verification failed"));
            return;
          }
          persistPaymentConfirmationFromApi(out);
          logPaymentEvent({
            eventType: "payment_success",
            amountPaise: chargePaise,
            razorpayOrderId: response.razorpay_order_id,
            phone,
            name: customerName,
            email,
          });
          resolve({
            paymentId: String(out.paymentId ?? response.razorpay_payment_id),
            orderId: String(out.orderId ?? response.razorpay_order_id),
            paidInr: Number(out.paidInr) || chargePaise / 100,
            balanceInr: Number(out.balanceInr) || 0,
            fullInr: Number(out.fullInr) || fullAmountPaise / 100,
            packageName: String(out.packageName ?? summary),
            emailSent: Boolean(out.emailSent),
            smsSent: Boolean(out.smsSent),
            invoiceDownloadUrl:
              typeof out.invoiceDownloadUrl === "string"
                ? out.invoiceDownloadUrl
                : undefined,
          });
        } catch (e) {
          reject(
            e instanceof Error ? e : new Error("Payment verification failed"),
          );
        }
      },
      theme: { color: "#0284c7" },
    };

    const rzp = new Razorpay(options);
    attachRazorpayPaymentFailed(rzp, (m) => {
      logPaymentEvent({
        eventType: "payment_failed",
        amountPaise: chargePaise,
        razorpayOrderId: orderData.id,
        error: m,
        phone,
        name: customerName,
        email,
      });
      reject(new Error(m));
    });
    rzp.open();
  });
}

export function pricingSummary(
  lines: ChatBookingLine[],
  payMode: "min" | "full",
): {
  itemCount: number;
  fullInr: number;
  minInr: number;
  chargeInr: number;
} {
  const itemCount = lines.reduce((s, l) => s + l.quantity, 0);
  const fullPaise = lines.reduce(
    (s, l) => s + Math.round(l.unitPrice * 100) * l.quantity,
    0,
  );
  const minPaise = computeMinPayPaise(itemCount, fullPaise);
  const chargePaise =
    payMode === "full" || minPaise >= fullPaise ? fullPaise : minPaise;
  return {
    itemCount,
    fullInr: fullPaise / 100,
    minInr: minPaise / 100,
    chargeInr: chargePaise / 100,
  };
}
