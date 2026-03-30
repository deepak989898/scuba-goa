"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Script from "next/script";
import { useCart } from "@/context/CartContext";
import { usePackages } from "@/hooks/usePackages";
import { useServices } from "@/hooks/useServices";
import {
  findPricedSubByCartKey,
  getPricedSubServicesWithIndex,
  getSubServiceCartKey,
} from "@/lib/service-sub-helpers";
import {
  encodeServiceBaseOption,
  encodePackageOption,
  encodeServiceSubOption,
  parseBookingOption,
} from "@/lib/booking-selection";
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

export function BookingForm() {
  const { packages, loading } = usePackages();
  const { services } = useServices();
  const searchParams = useSearchParams();
  const pre = searchParams.get("package");

  const {
    lines,
    ready: cartReady,
    itemCount,
    subtotalInr,
    addPackage,
    addService,
    setQuantity,
    removeLine,
    clearCart,
  } = useCart();

  /** Dropdown always returns to “Select…” after adding one line to the cart */
  const [pickerValue, setPickerValue] = useState("");
  const prePackageAdded = useRef(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [payMode, setPayMode] = useState<"min" | "full">("full");

  const addFromEncodedOption = useCallback(
    (encoded: string) => {
      const parsed = parseBookingOption(encoded);
      if (!parsed) return;
      if (parsed.kind === "package") {
        const p = packages.find((x) => x.id === parsed.id);
        if (p) {
          addPackage({
            id: p.id,
            name: p.name,
            price: p.price,
            image: p.imageUrl?.trim() || undefined,
            duration: p.duration,
          });
        }
        return;
      }
      if (parsed.kind === "serviceSub") {
        const found = findPricedSubByCartKey(
          services,
          parsed.slug,
          parsed.subKey
        );
        if (found?.sub.priceFrom != null) {
          const { service: s, sub, index } = found;
          const price = Number(found.sub.priceFrom);
          if (!Number.isFinite(price) || price <= 0) return;
          addService({
            slug: s.slug,
            title: `${s.title} — ${sub.title}`,
            priceFrom: price,
            subKey: getSubServiceCartKey(sub, index),
            image: s.image,
            duration: s.duration,
            includes: sub.includes ?? s.includes,
            rating: s.rating,
            slotsLeft: sub.slotsLeft ?? s.slotsLeft,
            bookedToday: sub.bookedToday ?? s.bookedToday,
          });
        }
      }
      if (parsed.kind === "service") {
        const s = services.find((x) => x.slug === parsed.slug);
        if (!s) return;
        if (!Number.isFinite(s.priceFrom) || s.priceFrom <= 0) return;
        addService({
          slug: s.slug,
          title: s.title,
          priceFrom: s.priceFrom,
          image: s.image,
          duration: s.duration,
          includes: s.includes,
          rating: s.rating,
          slotsLeft: s.slotsLeft,
          bookedToday: s.bookedToday,
        });
      }
    },
    [packages, services, addPackage, addService]
  );

  useEffect(() => {
    if (
      !cartReady ||
      !pre ||
      prePackageAdded.current ||
      !packages.some((p) => p.id === pre)
    ) {
      return;
    }
    addFromEncodedOption(encodePackageOption(pre));
    prePackageAdded.current = true;
  }, [cartReady, pre, packages, addFromEncodedOption]);

  const packagesByCategory = useMemo(() => {
    const map = new Map<string, typeof packages>();
    for (const p of packages) {
      const key = p.category?.trim() || "Packages";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [packages]);

  const hasCart = cartReady && lines.length > 0;

  const cartFullAmountPaise = Math.round(subtotalInr * 100);
  const cartMinPayPaise = hasCart
    ? computeMinPayPaise(itemCount, cartFullAmountPaise)
    : 0;
  const cartChargePaise =
    payMode === "full" || cartMinPayPaise >= cartFullAmountPaise
      ? cartFullAmountPaise
      : cartMinPayPaise;

  function onPickerChange(value: string) {
    if (!value) {
      setPickerValue("");
      return;
    }
    addFromEncodedOption(value);
    setPickerValue("");
  }

  async function pay() {
    setMsg(null);
    if (!name.trim() || !email.trim() || !phone.trim() || !date) {
      setMsg("Fill all required fields.");
      return;
    }
    if (!cartReady) {
      setMsg("Loading cart… try again.");
      return;
    }
    if (lines.length === 0) {
      setMsg(
        "Your cart is empty. Choose a package or service from the dropdown to add it."
      );
      return;
    }

    const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!key) {
      setMsg(
        "Razorpay key missing. Add NEXT_PUBLIC_RAZORPAY_KEY_ID for checkout."
      );
      return;
    }
    if (!window.Razorpay) {
      setMsg("Payment script still loading—try again in a second.");
      return;
    }

    const summary = cartSummary(lines);
    const cartItems = lines.map((l) => ({
      kind: l.kind,
      refId: l.refId,
      name: l.name,
      unitPrice: l.unitPrice,
      quantity: l.quantity,
      lineTotal: l.unitPrice * l.quantity,
    }));

    setBusy(true);
    try {
      const orderRes = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: cartChargePaise,
          fullAmountPaise: cartFullAmountPaise,
          payUnits: itemCount,
          currency: "INR",
          receipt: `bk_cart_${Date.now()}`,
        }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error ?? "Order failed");

      const bookingBase = {
        packageId: "cart",
        packageName: `Cart: ${summary}`,
        customerName: name,
        email,
        phone,
        date,
        people: itemCount,
        amountPaise: cartChargePaise,
        fullAmountPaise: cartFullAmountPaise,
        payUnits: itemCount,
        pickupLocation: pickupLocation.trim() || undefined,
        cartItems,
      };

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
                booking: bookingBase,
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
            window.location.href = "/?payment=success";
          } finally {
            setBusy(false);
          }
        },
        theme: { color: "#0284c7" },
      };

      const rzp = new window.Razorpay(options);
      attachRazorpayPaymentFailed(rzp, (m) => {
        setMsg(m);
        setBusy(false);
      });
      rzp.open();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  }

  const payButtonLabel = busy
    ? "Processing…"
    : hasCart
      ? `Pay ₹${(cartChargePaise / 100).toLocaleString("en-IN")} with Razorpay`
      : "Pay securely with Razorpay";

  return (
    <div className="mx-auto max-w-xl">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />
      <div className="rounded-2xl border border-ocean-100 bg-white p-6 shadow-sm">
        <h2 className="font-display text-xl font-semibold text-ocean-900">
          Book in 60 seconds
        </h2>
        <p className="mt-1 text-sm text-ocean-600">
          Minimum advance is ₹{MIN_PAYMENT_PER_PERSON_INR.toLocaleString("en-IN")}{" "}
          <span className="font-medium">per unit</span> in your cart (each line’s
          quantity counts as separate units). You can pay that minimum or the full
          cart total.
        </p>
        {loading ? (
          <p className="mt-6 text-sm text-ocean-600">Loading packages…</p>
        ) : (
          <div className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-ocean-800">
              Package or service option
              <select
                className="mt-1 w-full rounded-xl border border-ocean-200 px-3 py-2.5 text-ocean-900"
                value={pickerValue}
                onChange={(e) => onPickerChange(e.target.value)}
              >
                <option value="">Select to add to cart…</option>
                {packagesByCategory.map(([category, list]) => (
                  <optgroup key={category} label={category}>
                    {list.map((p) => (
                      <option
                        key={p.id}
                        value={encodePackageOption(p.id)}
                      >
                        {p.name} — ₹{p.price.toLocaleString("en-IN")}
                      </option>
                    ))}
                  </optgroup>
                ))}
                {services.map((s) => {
                  const priced = getPricedSubServicesWithIndex(s);
                  const showMainServiceOption =
                    priced.length === 0 &&
                    Number.isFinite(s.priceFrom) &&
                    s.priceFrom > 0;
                  return (
                    <optgroup key={`svc-${s.slug}`} label={s.title}>
                      {showMainServiceOption ? (
                        <option value={encodeServiceBaseOption(s.slug)}>
                          {s.title} (Main package) — ₹
                          {s.priceFrom.toLocaleString("en-IN")}
                        </option>
                      ) : null}
                      {priced.map(({ sub, index }) => (
                        <option
                          key={`${s.slug}-${getSubServiceCartKey(sub, index)}`}
                          value={encodeServiceSubOption(
                            s.slug,
                            getSubServiceCartKey(sub, index)
                          )}
                        >
                          {sub.title} — ₹
                          {sub.priceFrom!.toLocaleString("en-IN")}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </label>
            <p className="text-xs text-ocean-600">
              Each choice adds one unit to your cart. Use +/− below for more people
              or repeat bookings of the same item.
            </p>

            <div className="rounded-xl border border-ocean-200 bg-ocean-50/40 p-3">
              <p className="text-sm font-semibold text-ocean-900">
                Your cart (this page &amp; site-wide)
              </p>
              {!cartReady ? (
                <p className="mt-2 text-xs text-ocean-600">Loading cart…</p>
              ) : lines.length === 0 ? (
                <p className="mt-2 text-sm text-ocean-600">
                  No items yet. Pick a package or service from the dropdown above —
                  it will appear here so you can change quantity or remove it.
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {lines.map((line) => (
                    <li
                      key={line.key}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ocean-100 bg-white p-3 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-ocean-900">{line.name}</p>
                        <p className="text-xs text-ocean-600">
                          ₹{line.unitPrice.toLocaleString("en-IN")} each · line{" "}
                          ₹{(line.unitPrice * line.quantity).toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1 rounded-lg border border-ocean-200">
                          <button
                            type="button"
                            className="h-8 w-8 text-ocean-800"
                            aria-label="Decrease quantity"
                            onClick={() =>
                              setQuantity(line.key, line.quantity - 1)
                            }
                          >
                            −
                          </button>
                          <span className="w-6 text-center text-xs font-semibold">
                            {line.quantity}
                          </span>
                          <button
                            type="button"
                            className="h-8 w-8 text-ocean-800"
                            aria-label="Increase quantity"
                            onClick={() =>
                              setQuantity(line.key, line.quantity + 1)
                            }
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          className="text-xs font-semibold text-red-600 hover:underline"
                          onClick={() => removeLine(line.key)}
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <label className="block text-sm font-medium text-ocean-800">
              Full name
              <input
                className="mt-1 w-full rounded-xl border border-ocean-200 px-3 py-2.5"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </label>
            <label className="block text-sm font-medium text-ocean-800">
              Email
              <input
                type="email"
                className="mt-1 w-full rounded-xl border border-ocean-200 px-3 py-2.5"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </label>
            <label className="block text-sm font-medium text-ocean-800">
              Phone (WhatsApp)
              <input
                className="mt-1 w-full rounded-xl border border-ocean-200 px-3 py-2.5"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
              />
            </label>
            <label className="block text-sm font-medium text-ocean-800">
              Pickup location
              <input
                className="mt-1 w-full rounded-xl border border-ocean-200 px-3 py-2.5"
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
                placeholder="Hotel name, area, or full address"
                autoComplete="street-address"
              />
            </label>
            <label className="block text-sm font-medium text-ocean-800">
              Date
              <input
                type="date"
                className="mt-1 w-full rounded-xl border border-ocean-200 px-3 py-2.5"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>

            {hasCart ? (
              <div className="space-y-3 rounded-xl border border-ocean-100 bg-sand/60 p-4">
                <p className="text-lg font-bold text-ocean-900">
                  Cart total: ₹{subtotalInr.toLocaleString("en-IN")}
                </p>
                {cartMinPayPaise < cartFullAmountPaise ? (
                  <>
                    <p className="text-sm text-ocean-700">
                      Minimum advance: ₹
                      {(cartMinPayPaise / 100).toLocaleString("en-IN")} (₹
                      {MIN_PAYMENT_PER_PERSON_INR.toLocaleString("en-IN")} ×{" "}
                      {itemCount} {itemCount === 1 ? "unit" : "units"} in cart)
                    </p>
                    <div className="flex flex-wrap gap-3 text-sm">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name="payModeBooking"
                          checked={payMode === "min"}
                          onChange={() => setPayMode("min")}
                          className="text-ocean-700"
                        />
                        Pay minimum (₹
                        {(cartMinPayPaise / 100).toLocaleString("en-IN")})
                      </label>
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name="payModeBooking"
                          checked={payMode === "full"}
                          onChange={() => setPayMode("full")}
                        />
                        Pay full (₹
                        {(cartFullAmountPaise / 100).toLocaleString("en-IN")})
                      </label>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-ocean-600">
                    Cart total is below ₹{MIN_PAYMENT_PER_PERSON_INR.toLocaleString("en-IN")} × units; you’ll pay the full amount.
                  </p>
                )}
              </div>
            ) : null}
            {msg ? (
              <p className="text-sm text-ocean-700" role="status">
                {msg}
              </p>
            ) : null}
            <button
              type="button"
              onClick={pay}
              disabled={busy}
              className="w-full rounded-full bg-ocean-gradient py-3 text-sm font-semibold text-white shadow-md disabled:opacity-60"
            >
              {payButtonLabel}
            </button>
            <p className="text-center text-xs text-ocean-600">
              Booking is confirmed after successful payment verification.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
