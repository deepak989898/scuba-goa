"use client";

const RAZORPAY_CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

let razorpayCheckoutPromise: Promise<void> | null = null;

export function loadRazorpayCheckout(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Checkout is available in the browser only."));
  }
  if (window.Razorpay) return Promise.resolve();
  if (razorpayCheckoutPromise) return razorpayCheckoutPromise;

  razorpayCheckoutPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${RAZORPAY_CHECKOUT_SRC}"]`
    );

    const onReady = () => {
      if (window.Razorpay) {
        resolve();
      } else {
        razorpayCheckoutPromise = null;
        reject(new Error("Payment checkout could not start. Please try again."));
      }
    };

    const onError = () => {
      razorpayCheckoutPromise = null;
      reject(new Error("Payment checkout failed to load. Please try again."));
    };

    if (existing) {
      existing.addEventListener("load", onReady, { once: true });
      existing.addEventListener("error", onError, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = RAZORPAY_CHECKOUT_SRC;
    script.async = true;
    script.onload = onReady;
    script.onerror = onError;
    document.head.appendChild(script);
  });

  return razorpayCheckoutPromise;
}
