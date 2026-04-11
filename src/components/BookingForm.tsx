"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Script from "next/script";
import { useCart } from "@/context/CartContext";
import { usePackages } from "@/hooks/usePackages";
import { useServices } from "@/hooks/useServices";
import { findPricedSubByCartKey, getSubServiceCartKey } from "@/lib/service-sub-helpers";
import { HERO_BOOKING_OPT_PARAM } from "@/lib/hero-slide-booking";
import { encodePackageOption, parseBookingOption } from "@/lib/booking-selection";
import { BookingPackagePicker } from "@/components/BookingPackagePicker";
import { SITE_NAME } from "@/lib/constants";
import { attachRazorpayPaymentFailed } from "@/lib/razorpayCheckout";
import { persistPaymentConfirmationFromApi } from "@/lib/payment-confirmation";
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

const LEAD_SID_KEY = "bsg_marketing_sid";

async function resolveRazorpayKeyId(): Promise<string> {
  const buildKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  if (buildKey) return buildKey;
  const res = await fetch("/api/razorpay/public-key", { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  const keyId = typeof data?.keyId === "string" ? data.keyId.trim() : "";
  if (!res.ok || !keyId) {
    throw new Error(
      data?.error ??
        "Razorpay key missing. Set NEXT_PUBLIC_RAZORPAY_KEY_ID or RAZORPAY_KEY_ID in Vercel."
    );
  }
  return keyId;
}

function getLeadSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = sessionStorage.getItem(LEAD_SID_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `m_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(LEAD_SID_KEY, id);
    }
    return id;
  } catch {
    return `m_${Date.now()}`;
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
  const { services, loading: servicesLoading } = useServices();
  const searchParams = useSearchParams();
  const pre = searchParams.get("package");
  const preOpt = searchParams.get(HERO_BOOKING_OPT_PARAM);

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

  const prefillFromQueryApplied = useRef(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [payMode, setPayMode] = useState<"min" | "full">("min");
  const [leadSentAt, setLeadSentAt] = useState<number>(0);
  /** Hide name / contact fields until the user has a cart and taps continue (less first-screen friction). */
  const [contactStepOpen, setContactStepOpen] = useState(false);

  const [promoDraft, setPromoDraft] = useState("");
  const [promoApplied, setPromoApplied] = useState<{
    code: string;
    title: string;
    discountPercent: number;
    subtotalBeforeDiscountPaise: number;
    discountedFullPaise: number;
  } | null>(null);
  const [promoBusy, setPromoBusy] = useState(false);

  const linesKey = useMemo(
    () => lines.map((l) => `${l.key}:${l.quantity}`).join("|"),
    [lines]
  );

  useEffect(() => {
    setPromoApplied(null);
    setPromoDraft("");
  }, [linesKey]);

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
    if (!cartReady || prefillFromQueryApplied.current) return;
    if (loading || servicesLoading) return;

    const optRaw = preOpt?.trim();
    if (optRaw) {
      const parsed = parseBookingOption(optRaw);
      if (!parsed) {
        prefillFromQueryApplied.current = true;
        return;
      }
      if (parsed.kind === "package") {
        if (!packages.some((p) => p.id === parsed.id)) return;
        addFromEncodedOption(optRaw);
        prefillFromQueryApplied.current = true;
        return;
      }
      addFromEncodedOption(optRaw);
      prefillFromQueryApplied.current = true;
      return;
    }

    const pkgRaw = pre?.trim();
    if (!pkgRaw) return;
    if (!packages.some((p) => p.id === pkgRaw)) return;
    addFromEncodedOption(encodePackageOption(pkgRaw));
    prefillFromQueryApplied.current = true;
  }, [
    cartReady,
    loading,
    servicesLoading,
    pre,
    preOpt,
    packages,
    addFromEncodedOption,
  ]);

  useEffect(() => {
    if (lines.length === 0) setContactStepOpen(false);
  }, [lines.length]);

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

  const baseSubtotalPaise = Math.round(subtotalInr * 100);
  const cartFullAmountPaise = promoApplied
    ? promoApplied.discountedFullPaise
    : baseSubtotalPaise;
  const cartMinPayPaise = hasCart
    ? computeMinPayPaise(itemCount, cartFullAmountPaise)
    : 0;
  const cartChargePaise =
    payMode === "full" || cartMinPayPaise >= cartFullAmountPaise
      ? cartFullAmountPaise
      : cartMinPayPaise;

  const cartItemsPayload = useMemo(
    () =>
      lines.map((l) => ({
        kind: l.kind,
        refId: l.refId,
        name: l.name,
        unitPrice: l.unitPrice,
        quantity: l.quantity,
        lineTotal: l.unitPrice * l.quantity,
      })),
    [lines]
  );

  async function applyPromoCode() {
    if (!promoDraft.trim() || !hasCart) return;
    setPromoBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promoCode: promoDraft.trim(),
          payUnits: itemCount,
          payMode,
          cartItems: cartItemsPayload.map((c) => ({
            unitPrice: c.unitPrice,
            quantity: c.quantity,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPromoApplied(null);
        setMsg(typeof data.error === "string" ? data.error : "Invalid promo code.");
        return;
      }
      setPromoApplied({
        code: String(data.promoCode ?? "").toUpperCase(),
        title: String(data.title ?? "Offer"),
        discountPercent: Number(data.discountPercent ?? 0),
        subtotalBeforeDiscountPaise: Number(data.subtotalBeforeDiscountPaise ?? 0),
        discountedFullPaise: Number(data.discountedFullPaise ?? 0),
      });
      setMsg(null);
    } catch {
      setPromoApplied(null);
      setMsg("Could not validate promo. Try again.");
    } finally {
      setPromoBusy(false);
    }
  }

  function onPickerChange(value: string) {
    if (!value) return;
    addFromEncodedOption(value);
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
      const key = await resolveRazorpayKeyId();
      const orderRes = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: cartChargePaise,
          fullAmountPaise: cartFullAmountPaise,
          payUnits: itemCount,
          currency: "INR",
          receipt: `bk_cart_${Date.now()}`,
          ...(promoApplied
            ? {
                promoCode: promoApplied.code,
                cartItems: cartItemsPayload.map((c) => ({
                  unitPrice: c.unitPrice,
                  quantity: c.quantity,
                })),
              }
            : {}),
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
        ...(promoApplied
          ? {
              promoCode: promoApplied.code,
              discountPercent: promoApplied.discountPercent,
              subtotalBeforeDiscountPaise: promoApplied.subtotalBeforeDiscountPaise,
            }
          : {}),
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
            persistPaymentConfirmationFromApi(out);
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

  useEffect(() => {
    if (!cartReady || lines.length === 0 || !contactStepOpen) return;
    if (!name.trim() || !phone.trim()) return;
    const now = Date.now();
    if (now - leadSentAt < 90_000) return;

    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      interestedItem: lines[0]?.name ?? "Booking intent",
      preferredDate: date || "",
      source: "booking_form",
      sessionId: getLeadSessionId(),
    };
    const t = window.setTimeout(() => {
      void fetch("/api/marketing/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {});
      setLeadSentAt(Date.now());
    }, 800);
    return () => window.clearTimeout(t);
  }, [cartReady, lines, name, phone, date, leadSentAt, contactStepOpen]);

  return (
    <div className="mx-auto max-w-xl">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
      />
      <div className="rounded-2xl border border-ocean-100 bg-white p-6 shadow-sm">
        <h2 className="font-display text-xl font-semibold text-ocean-900">
          Book in 60 seconds
        </h2>
        <ol className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-ocean-800 sm:text-xs">
          <li className="rounded-full bg-ocean-100 px-2.5 py-1">1. Cart</li>
          <li className="rounded-full bg-ocean-100 px-2.5 py-1">2. Details</li>
          <li className="rounded-full bg-cyan-100 px-2.5 py-1 text-ocean-900">
            3. Pay (Razorpay) → instant confirm
          </li>
        </ol>
        {loading ? (
          <p className="mt-6 text-sm text-ocean-600">Loading packages…</p>
        ) : (
          <div className="mt-6 space-y-4">
            <label className="block cursor-pointer text-sm font-medium text-ocean-800">
              <span className="mb-0.5 block">Package or service option</span>
              <BookingPackagePicker
                packagesByCategory={packagesByCategory}
                services={services}
                onSelect={onPickerChange}
              />
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

            {hasCart ? (
              <div className="mt-4 rounded-xl border border-amber-200/90 bg-amber-50/60 p-3 sm:p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">
                  Promo code (optional · online checkout only)
                </p>
                <p className="mt-1 text-[11px] text-amber-950/80">
                  One code per booking. See{" "}
                  <a href="/offers" className="font-semibold underline">
                    current offers
                  </a>
                  .
                </p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    type="text"
                    className="w-full rounded-lg border border-amber-200/80 bg-white px-3 py-2 text-sm text-ocean-900 placeholder:text-ocean-400"
                    placeholder="e.g. COUPLE10"
                    value={promoDraft}
                    onChange={(e) => setPromoDraft(e.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      disabled={promoBusy || !promoDraft.trim()}
                      onClick={() => void applyPromoCode()}
                      className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-amber-500 disabled:opacity-50"
                    >
                      {promoBusy ? "…" : "Apply"}
                    </button>
                    {promoApplied ? (
                      <button
                        type="button"
                        onClick={() => {
                          setPromoApplied(null);
                          setMsg(null);
                        }}
                        className="rounded-lg border border-amber-700/30 bg-white px-3 py-2 text-xs font-semibold text-amber-950"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>
                {promoApplied ? (
                  <p className="mt-2 text-xs font-medium text-green-900">
                    {promoApplied.title} — {promoApplied.discountPercent}% off. New cart
                    total ₹{(promoApplied.discountedFullPaise / 100).toLocaleString("en-IN")}
                    .
                  </p>
                ) : null}
              </div>
            ) : null}

            {hasCart && !contactStepOpen ? (
              <div className="rounded-xl border border-cyan-200 bg-cyan-50/80 p-4 text-center">
                <p className="text-sm font-semibold text-ocean-900">
                  {promoApplied ? (
                    <>
                      <span className="text-ocean-500 line-through">
                        ₹{subtotalInr.toLocaleString("en-IN")}
                      </span>{" "}
                      → ₹{(cartFullAmountPaise / 100).toLocaleString("en-IN")}
                    </>
                  ) : (
                    <>Cart total: ₹{subtotalInr.toLocaleString("en-IN")}</>
                  )}
                </p>
                <p className="mt-1 text-xs text-ocean-700">
                  Pay ₹{(cartMinPayPaise / 100).toLocaleString("en-IN")} now to lock (advance) ·
                  balance on the day, unless you choose full pay in the next step.
                </p>
                <button
                  type="button"
                  onClick={() => setContactStepOpen(true)}
                  className="mt-4 w-full rounded-full bg-ocean-gradient py-3 text-sm font-bold text-white shadow-md transition hover:brightness-110"
                >
                  Continue — enter details &amp; pay
                </button>
              </div>
            ) : null}

            {hasCart && contactStepOpen ? (
              <>
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

                <div className="space-y-3 rounded-xl border border-ocean-100 bg-sand/60 p-4">
                  <p className="text-lg font-bold text-ocean-900">
                    {promoApplied ? (
                      <>
                        <span className="text-base font-semibold text-ocean-600 line-through">
                          ₹{subtotalInr.toLocaleString("en-IN")}
                        </span>{" "}
                        <span className="text-ocean-900">
                          ₹{(cartFullAmountPaise / 100).toLocaleString("en-IN")}
                        </span>
                        <span className="mt-1 block text-xs font-normal text-green-800">
                          {promoApplied.title} ({promoApplied.discountPercent}% off)
                        </span>
                      </>
                    ) : (
                      <>Cart total: ₹{subtotalInr.toLocaleString("en-IN")}</>
                    )}
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
                      Cart total is below ₹
                      {MIN_PAYMENT_PER_PERSON_INR.toLocaleString("en-IN")} × units; you’ll pay
                      the full amount.
                    </p>
                  )}
                </div>
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
                  Razorpay (UPI / card / netbanking) → instant confirm on this site + email when
                  configured.
                </p>
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
