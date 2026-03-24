"use client";

import { AnimatePresence, motion } from "framer-motion";
import Script from "next/script";
import { useEffect, useState } from "react";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import { useCart } from "@/context/CartContext";
import { SITE_NAME } from "@/lib/constants";
import { attachRazorpayPaymentFailed } from "@/lib/razorpayCheckout";
import {
  computeMinPayPaise,
  MIN_PAYMENT_PER_PERSON_INR,
} from "@/lib/payment";
import type { CartLine } from "@/lib/types";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function cartSummary(lines: CartLine[]): string {
  return lines
    .map((l) => `${l.name} ×${l.quantity}`)
    .join(", ")
    .slice(0, 200);
}

export function CartFAB() {
  const {
    lines,
    ready,
    itemCount,
    subtotalInr,
    setQuantity,
    removeLine,
    clearCart,
  } = useCart();
  const [open, setOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [payMode, setPayMode] = useState<"min" | "full">("full");

  const fullAmountPaise = Math.round(subtotalInr * 100);
  const minPayPaise = computeMinPayPaise(itemCount, fullAmountPaise);
  const chargePaise =
    payMode === "full" || minPayPaise >= fullAmountPaise
      ? fullAmountPaise
      : minPayPaise;
  const showFab = ready && itemCount > 0;

  useEffect(() => {
    if (ready && itemCount === 0 && open) {
      setOpen(false);
      setCheckoutOpen(false);
    }
  }, [ready, itemCount, open]);

  async function pay() {
    setMsg(null);
    if (
      !name.trim() ||
      !email.trim() ||
      !phone.trim() ||
      !date ||
      !pickupLocation.trim()
    ) {
      setMsg("Fill all fields including pickup / address.");
      return;
    }
    if (lines.length === 0) {
      setMsg("Your cart is empty.");
      return;
    }
    const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!key) {
      setMsg("Razorpay key missing.");
      return;
    }
    if (!window.Razorpay) {
      setMsg("Payment script loading—try again.");
      return;
    }
    setBusy(true);
    try {
      const orderRes = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: chargePaise,
          fullAmountPaise,
          payUnits: itemCount,
          currency: "INR",
          receipt: `cart_${Date.now()}`,
        }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error ?? "Order failed");

      const summary = cartSummary(lines);
      const cartItems = lines.map((l) => ({
        kind: l.kind,
        refId: l.refId,
        name: l.name,
        unitPrice: l.unitPrice,
        quantity: l.quantity,
        lineTotal: l.unitPrice * l.quantity,
      }));

      const options: Record<string, unknown> = {
        key,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.id,
        name: SITE_NAME,
        description: summary.slice(0, 80) || "Goa experiences",
        prefill: { name, email, contact: phone },
        modal: {
          ondismiss: () => setBusy(false),
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
                booking: {
                  packageId: "cart",
                  packageName: `Cart: ${summary}`,
                  customerName: name,
                  email,
                  phone,
                  date,
                  people: itemCount,
                  amountPaise: chargePaise,
                  fullAmountPaise,
                  payUnits: itemCount,
                  pickupLocation: pickupLocation.trim(),
                  cartItems,
                },
              }),
            });
            const out = await v.json();
            if (!v.ok) {
              setMsg(out.error ?? "Verification failed");
              return;
            }
            if (out.warning) {
              try {
                sessionStorage.setItem("paymentNotice", String(out.warning));
              } catch {
                /* ignore */
              }
            }
            clearCart();
            setOpen(false);
            setCheckoutOpen(false);
            window.location.href = "/?payment=success";
          } finally {
            setBusy(false);
          }
        },
        theme: { color: "#0284c7" },
      };

      const rzp = new window.Razorpay(options);
      attachRazorpayPaymentFailed(rzp, (msg) => {
        setMsg(msg);
        setBusy(false);
      });
      rzp.open();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Payment error");
      setBusy(false);
    }
  }

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />

      <AnimatePresence>
        {showFab && (
          <motion.button
            type="button"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 24 }}
            onClick={() => {
              setOpen(true);
              setMsg(null);
            }}
            className="fixed bottom-[calc(7.25rem-15px+env(safe-area-inset-bottom,0px))] left-4 z-[58] flex h-14 w-14 items-center justify-center rounded-full bg-ocean-800 text-white shadow-lg shadow-ocean-900/30 transition hover:bg-ocean-700 md:bottom-8 md:left-8 md:h-16 md:w-16"
            aria-label={`Open cart, ${itemCount} items`}
          >
            <svg
              className="h-7 w-7 md:h-8 md:w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-bold text-ocean-900">
              {itemCount > 99 ? "99+" : itemCount}
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            key="cart-drawer"
            className="fixed inset-0 z-[59] flex justify-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              className="absolute inset-0 bg-ocean-950/50 backdrop-blur-sm"
              aria-label="Close cart overlay"
              onClick={() => {
                setOpen(false);
                setCheckoutOpen(false);
              }}
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="Shopping cart"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-ocean-100 px-4 py-4">
                <h2 className="font-display text-lg font-bold text-ocean-900">
                  Your cart
                </h2>
                <button
                  type="button"
                  className="rounded-full p-2 text-ocean-600 hover:bg-ocean-50"
                  onClick={() => {
                    setOpen(false);
                    setCheckoutOpen(false);
                  }}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4">
                <ul className="space-y-4">
                  {lines.map((line) => (
                    <li
                      key={line.key}
                      className="flex gap-3 rounded-xl border border-ocean-100 bg-sand/80 p-3"
                    >
                      <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-ocean-100">
                        {line.image ? (
                          <CmsRemoteImage
                            src={line.image}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="80px"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-ocean-900">{line.name}</p>
                        {line.duration ? (
                          <p className="text-xs text-ocean-600">{line.duration}</p>
                        ) : null}
                        {line.includes && line.includes.length > 0 ? (
                          <ul className="mt-1 flex flex-wrap gap-1">
                            {line.includes.map((inc, i) => (
                              <li
                                key={`${line.key}-inc-${i}`}
                                className="rounded bg-ocean-50 px-1.5 py-0.5 text-[10px] text-ocean-700"
                              >
                                {inc}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        <p className="mt-1 text-sm font-semibold text-ocean-800">
                          ₹{line.unitPrice.toLocaleString("en-IN")} each
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            type="button"
                            className="h-8 w-8 rounded-lg border border-ocean-200 text-ocean-800"
                            onClick={() =>
                              setQuantity(line.key, line.quantity - 1)
                            }
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <span className="w-8 text-center text-sm font-semibold">
                            {line.quantity}
                          </span>
                          <button
                            type="button"
                            className="h-8 w-8 rounded-lg border border-ocean-200 text-ocean-800"
                            onClick={() =>
                              setQuantity(line.key, line.quantity + 1)
                            }
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            className="ml-auto text-xs font-semibold text-red-600"
                            onClick={() => removeLine(line.key)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border-t border-ocean-100 bg-white p-4">
                <div className="flex items-center justify-between text-lg font-bold text-ocean-900">
                  <span>Total</span>
                  <span>₹{subtotalInr.toLocaleString("en-IN")}</span>
                </div>
                {!checkoutOpen ? (
                  <button
                    type="button"
                    onClick={() => setCheckoutOpen(true)}
                    className="mt-4 w-full rounded-full bg-ocean-gradient py-3 text-sm font-semibold text-white shadow-md"
                  >
                    Checkout with Razorpay
                  </button>
                ) : (
                  <div className="mt-4 space-y-3">
                    <p className="text-sm font-medium text-ocean-800">
                      Trip / activity date
                    </p>
                    <input
                      type="date"
                      className="w-full rounded-xl border border-ocean-200 px-3 py-2 text-sm"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                    <input
                      className="w-full rounded-xl border border-ocean-200 px-3 py-2 text-sm"
                      placeholder="Full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                    <input
                      type="email"
                      className="w-full rounded-xl border border-ocean-200 px-3 py-2 text-sm"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <input
                      className="w-full rounded-xl border border-ocean-200 px-3 py-2 text-sm"
                      placeholder="Phone (WhatsApp)"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                    <label className="block text-xs font-medium text-ocean-800">
                      Pickup / address
                      <input
                        className="mt-1 w-full rounded-xl border border-ocean-200 px-3 py-2 text-sm"
                        placeholder="Hotel, area, or full address"
                        value={pickupLocation}
                        onChange={(e) => setPickupLocation(e.target.value)}
                        autoComplete="street-address"
                      />
                    </label>
                    {minPayPaise < fullAmountPaise ? (
                      <div className="rounded-xl border border-ocean-100 bg-sand/80 p-3 text-xs text-ocean-800">
                        <p className="font-medium text-ocean-900">
                          Minimum advance: ₹{(minPayPaise / 100).toLocaleString("en-IN")}{" "}
                          ({MIN_PAYMENT_PER_PERSON_INR.toLocaleString("en-IN")} × {itemCount}{" "}
                          {itemCount === 1 ? "item" : "items"})
                        </p>
                        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                          <label className="flex cursor-pointer items-center gap-2">
                            <input
                              type="radio"
                              name="cartPayMode"
                              checked={payMode === "min"}
                              onChange={() => setPayMode("min")}
                            />
                            Pay minimum (₹{(minPayPaise / 100).toLocaleString("en-IN")})
                          </label>
                          <label className="flex cursor-pointer items-center gap-2">
                            <input
                              type="radio"
                              name="cartPayMode"
                              checked={payMode === "full"}
                              onChange={() => setPayMode("full")}
                            />
                            Pay full (₹{(fullAmountPaise / 100).toLocaleString("en-IN")})
                          </label>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-ocean-600">
                        Cart total is below the per-item minimum; you’ll pay the full
                        amount.
                      </p>
                    )}
                    {msg ? (
                      <p className="text-sm text-red-600" role="alert">
                        {msg}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={pay}
                      className="w-full rounded-full bg-ocean-gradient py-3 text-sm font-semibold text-white shadow-md disabled:opacity-60"
                    >
                      {busy
                        ? "Processing…"
                        : `Pay ₹${(chargePaise / 100).toLocaleString("en-IN")}`}
                    </button>
                    <button
                      type="button"
                      className="w-full text-sm font-medium text-ocean-600"
                      onClick={() => setCheckoutOpen(false)}
                    >
                      ← Back to cart
                    </button>
                  </div>
                )}
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
