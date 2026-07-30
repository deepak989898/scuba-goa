"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { usePackages } from "@/hooks/usePackages";
import { useServices } from "@/hooks/useServices";
import { findPricedSubByCartKey, getSubServiceCartKey } from "@/lib/service-sub-helpers";
import { HERO_BOOKING_OPT_PARAM } from "@/lib/hero-slide-booking";
import { encodePackageOption, parseBookingOption } from "@/lib/booking-selection";
import { BookingPackagePicker } from "@/components/BookingPackagePicker";
import { SITE_NAME } from "@/lib/constants";
import { loadRazorpayCheckout } from "@/lib/loadRazorpayCheckout";
import { attachRazorpayPaymentFailed } from "@/lib/razorpayCheckout";
import { persistPaymentConfirmationFromApi } from "@/lib/payment-confirmation";
import { trackMetaPurchase } from "@/lib/meta-pixel";
import {
  computeMinPayPaise,
  MIN_PAYMENT_PER_PERSON_INR,
} from "@/lib/payment";
import type { CartLine, PackageDoc } from "@/lib/types";
import { getOrCreateAnalyticsSessionId } from "@/lib/analytics-client-ids";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import type { ServiceItem } from "@/data/services";
import { BookingSidePanel } from "@/components/booking/BookingSidePanel";

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
        "Razorpay key missing. Set NEXT_PUBLIC_RAZORPAY_KEY_ID or RAZORPAY_KEY_ID in Vercel."
    );
  }
  return keyId;
}

function cartSummary(lines: CartLine[]): string {
  return lines
    .map((l) => `${l.name} ×${l.quantity}`)
    .join(", ")
    .slice(0, 200);
}

/** Prefer stored cart image; fall back to live package/service catalog. */
function resolveCartLineImage(
  line: CartLine,
  packages: PackageDoc[],
  services: ServiceItem[],
): string | undefined {
  const stored = line.image?.trim();
  if (stored) return stored;
  if (line.kind === "package") {
    return (
      packages.find((p) => p.id === line.refId)?.imageUrl?.trim() || undefined
    );
  }
  const slug = line.refId.split("#")[0]?.trim() || "";
  if (!slug) return undefined;
  return services.find((s) => s.slug === slug)?.image?.trim() || undefined;
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
      await loadRazorpayCheckout();
      const Razorpay = window.Razorpay;
      if (!Razorpay) {
        throw new Error("Payment checkout could not start. Please try again.");
      }
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

      const { logPaymentEvent } = await import("@/lib/analytics-payment-event");
      logPaymentEvent({
        eventType: "checkout_started",
        amountPaise: cartChargePaise,
        razorpayOrderId: orderData.id,
        phone,
        name,
        email,
      });

      const options: Record<string, unknown> = {
        key,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.id,
        name: SITE_NAME,
        description: summary.slice(0, 80) || "Goa experiences",
        prefill: { name, email, contact: phone },
        modal: {
          ondismiss: () => {
            logPaymentEvent({
              eventType: "checkout_dismissed",
              amountPaise: cartChargePaise,
              razorpayOrderId: orderData.id,
              phone,
              name,
              email,
            });
            setBusy(false);
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
                amountPaise: cartChargePaise,
                razorpayOrderId: response.razorpay_order_id,
                error: out.error ?? "Verification failed",
                phone,
                name,
                email,
              });
              setMsg(out.error ?? "Verification failed");
              return;
            }
            persistPaymentConfirmationFromApi(out);
            trackMetaPurchase({
              valueInr: cartChargePaise / 100,
              numItems: itemCount,
              contentIds: lines.map((l) => String(l.refId ?? l.key)),
              contentName: summary.slice(0, 120),
            });
            if (
              out.warning &&
              !out.notificationsQueued &&
              !/MAIL_SMTP|RESEND_API_KEY|Vercel|MSG91|TWILIO/i.test(
                String(out.warning),
              )
            ) {
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

      const rzp = new Razorpay(options);
      attachRazorpayPaymentFailed(rzp, (m) => {
        logPaymentEvent({
          eventType: "payment_failed",
          amountPaise: cartChargePaise,
          razorpayOrderId: orderData.id,
          error: m,
          phone,
          name,
          email,
        });
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
    ? "Confirming payment…"
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
      sessionId: getOrCreateAnalyticsSessionId(),
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
    <div className="mx-auto max-w-7xl">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.8fr)] lg:items-start lg:gap-4">
        <div className="rounded-xl border border-ocean-100 bg-white p-3 shadow-md sm:p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-lg font-bold text-ocean-900 sm:text-xl">
              Book in 60 seconds
            </h2>
            <span
              className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700"
              aria-hidden
            >
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor">
                <path d="M12 2a1 1 0 011 1v1.07A8 8 0 1120.93 11H22a1 1 0 110 2h-1.07A8 8 0 1112 4.07V3a1 1 0 011-1zm0 5a1 1 0 011 1v3.59l2.3 2.3a1 1 0 11-1.4 1.42l-2.6-2.6A1 1 0 0111 12V8a1 1 0 011-1z" />
              </svg>
              Fast checkout
            </span>
          </div>

          <ol className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold sm:text-[11px]">
            <li
              className={`rounded-full px-2.5 py-1 ${
                !contactStepOpen
                  ? "bg-sky-500 text-white shadow-sm"
                  : "bg-ocean-100 text-ocean-800"
              }`}
            >
              1. Cart
            </li>
            <li
              className={`rounded-full px-2.5 py-1 ${
                contactStepOpen
                  ? "bg-sky-500 text-white shadow-sm"
                  : "bg-ocean-100 text-ocean-800"
              }`}
            >
              2. Details
            </li>
            <li className="rounded-full bg-ocean-100 px-2.5 py-1 text-ocean-800">
              3. Pay (Razorpay)
            </li>
            <li className="rounded-full bg-emerald-500 px-2.5 py-1 font-bold text-white shadow-sm">
              → Instant confirm
            </li>
          </ol>

          {loading ? (
            <p className="mt-3 text-sm text-ocean-700">Loading packages…</p>
          ) : (
            <div className="mt-3 space-y-3">
              <label className="block cursor-pointer text-sm font-medium text-ocean-800">
                <span className="mb-0.5 block">Package or service option</span>
                <BookingPackagePicker
                  packagesByCategory={packagesByCategory}
                  services={services}
                  onSelect={onPickerChange}
                />
              </label>
              <p className="text-[11px] text-ocean-700">
                Pick an item above — use +/− for extra people.
              </p>

              <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-2.5 sm:p-3">
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-white"
                    aria-hidden
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                      <path d="M7 4h-2l-1 2H1v2h2l3.6 7.6L5.2 18c-.4.7.1 1.5.9 1.5H19v-2H7.4l1.1-2h8.7c.7 0 1.3-.4 1.6-1l3.2-5.8c.3-.6-.1-1.4-.8-1.4H6.2L5.3 4H7zm12 14a2 2 0 11-.001 3.999A2 2 0 0119 18zm-10 0a2 2 0 11-.001 3.999A2 2 0 019 18z" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-sm font-bold text-ocean-900">Your cart</p>
                    <p className="text-[10px] text-ocean-600">
                      Saved on this page and across the site.
                    </p>
                  </div>
                </div>
                {!cartReady ? (
                  <p className="mt-2 text-xs text-ocean-700">Loading cart…</p>
                ) : lines.length === 0 ? (
                  <p className="mt-2 text-sm text-ocean-700">
                    No items yet. Pick a package or service from the dropdown
                    above.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {lines.map((line) => {
                      const imageUrl = resolveCartLineImage(
                        line,
                        packages,
                        services,
                      );
                      return (
                        <li
                          key={line.key}
                          className="flex flex-wrap items-center gap-2 rounded-lg border border-ocean-100 bg-white p-2 text-sm shadow-sm"
                        >
                          <div className="relative h-12 w-14 shrink-0 overflow-hidden rounded-md bg-ocean-100">
                            {imageUrl ? (
                              <CmsRemoteImage
                                src={imageUrl}
                                alt={line.name}
                                fill
                                className="object-cover"
                                sizes="56px"
                              />
                            ) : (
                              <div
                                className="flex h-full w-full items-center justify-center text-[9px] font-semibold text-ocean-400"
                                aria-hidden
                              >
                                —
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium leading-snug text-ocean-900">
                              {line.name}
                            </p>
                            <p className="text-[11px] text-ocean-700">
                              ₹{line.unitPrice.toLocaleString("en-IN")} each ·
                              subtotal ₹
                              {(line.unitPrice * line.quantity).toLocaleString(
                                "en-IN",
                              )}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <div className="flex items-center rounded-md border border-sky-300 bg-white">
                              <button
                                type="button"
                                className="h-9 w-9 touch-manipulation text-sm font-bold text-ocean-800"
                                aria-label="Decrease quantity"
                                onClick={() =>
                                  setQuantity(line.key, line.quantity - 1)
                                }
                              >
                                −
                              </button>
                              <span className="w-5 text-center text-xs font-semibold">
                                {line.quantity}
                              </span>
                              <button
                                type="button"
                                className="h-9 w-9 touch-manipulation text-sm font-bold text-ocean-800"
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
                              className="min-h-9 touch-manipulation rounded-full px-2.5 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50"
                              onClick={() => removeLine(line.key)}
                            >
                              Remove
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {hasCart && !contactStepOpen ? (
                <div className="rounded-xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-white p-3 text-center shadow-sm lg:hidden">
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
                    Pay ₹{(cartMinPayPaise / 100).toLocaleString("en-IN")} now to
                    lock (advance).
                  </p>
                  <button
                    type="button"
                    onClick={() => setContactStepOpen(true)}
                    className="mt-3 w-full rounded-full bg-ocean-gradient py-2.5 text-sm font-bold text-white shadow-md transition hover:brightness-110"
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
                      className="mt-1 w-full rounded-xl border border-ocean-200 px-3 py-2"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                    />
                  </label>
                  <label className="block text-sm font-medium text-ocean-800">
                    Email
                    <input
                      type="email"
                      className="mt-1 w-full rounded-xl border border-ocean-200 px-3 py-2"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </label>
                  <label className="block text-sm font-medium text-ocean-800">
                    Phone (WhatsApp)
                    <input
                      className="mt-1 w-full rounded-xl border border-ocean-200 px-3 py-2"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      autoComplete="tel"
                    />
                  </label>
                  <label className="block text-sm font-medium text-ocean-800">
                    Pickup location
                    <input
                      className="mt-1 w-full rounded-xl border border-ocean-200 px-3 py-2"
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
                      className="mt-1 w-full rounded-xl border border-ocean-200 px-3 py-2"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </label>

                  {cartMinPayPaise < cartFullAmountPaise ? (
                    <div className="space-y-2 rounded-xl border border-ocean-100 bg-sand/60 p-3 lg:hidden">
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
                    </div>
                  ) : null}

                  {msg ? (
                    <p className="text-sm text-ocean-700 lg:hidden" role="status">
                      {msg}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={pay}
                    disabled={busy}
                    className="w-full rounded-full bg-ocean-gradient py-2.5 text-sm font-semibold text-white shadow-md disabled:opacity-60 lg:hidden"
                  >
                    {payButtonLabel}
                  </button>
                </>
              ) : null}

              <ul className="grid grid-cols-3 gap-1.5">
                <li className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-1.5 py-1.5 text-[10px] font-bold text-emerald-800 sm:gap-1.5 sm:px-2 sm:text-[11px]">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="currentColor" aria-hidden>
                    <path d="M16 11c1.7 0 3-1.3 3-3s-1.3-3-3-3-3 1.3-3 3 1.3 3 3 3zM8 11c1.7 0 3-1.3 3-3S9.7 5 8 5 5 6.3 5 8s1.3 3 3 3zm0 2c-2.7 0-8 1.3-8 4v2h10v-2c0-2.7-5.3-4-8-4zm8 0c-.3 0-.7 0-1 .1 1.2.8 2 2 2 3.9V19h8v-2c0-2.7-5.3-4-8-4z" />
                  </svg>
                  1000+ Divers
                </li>
                <li className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-1.5 py-1.5 text-[10px] font-bold text-rose-800 sm:gap-1.5 sm:px-2 sm:text-[11px]">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="currentColor" aria-hidden>
                    <path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 1112 6a2.5 2.5 0 010 5.5z" />
                  </svg>
                  Baga Beach
                </li>
                <li className="flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-1.5 py-1.5 text-[10px] font-bold text-sky-800 sm:gap-1.5 sm:px-2 sm:text-[11px]">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="currentColor" aria-hidden>
                    <path d="M12 1L3 5v6c0 5.6 3.8 10.7 9 12 5.2-1.3 9-6.4 9-12V5l-9-4zm-1 15l-4-4 1.4-1.4L11 13.2l5.6-5.6L18 9l-7 7z" />
                  </svg>
                  Certified
                </li>
              </ul>
            </div>
          )}
        </div>

        <BookingSidePanel
          promo={{
            promoDraft,
            setPromoDraft,
            promoBusy,
            promoApplied,
            onApply: () => void applyPromoCode(),
            onClear: () => {
              setPromoApplied(null);
              setMsg(null);
            },
          }}
          checkoutSlot={
            hasCart ? (
              !contactStepOpen ? (
                <div className="hidden rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-center shadow-sm lg:block">
                  <p className="text-sm font-bold text-ocean-900">
                    {promoApplied ? (
                      <>
                        <span className="font-semibold text-ocean-500 line-through">
                          ₹{subtotalInr.toLocaleString("en-IN")}
                        </span>{" "}
                        → ₹{(cartFullAmountPaise / 100).toLocaleString("en-IN")}
                      </>
                    ) : (
                      <>Cart total: ₹{subtotalInr.toLocaleString("en-IN")}</>
                    )}
                  </p>
                  <p className="mt-1 text-[11px] text-ocean-700">
                    Pay ₹{(cartMinPayPaise / 100).toLocaleString("en-IN")} now
                    (advance) · balance on the day.
                  </p>
                  <button
                    type="button"
                    onClick={() => setContactStepOpen(true)}
                    className="mt-3 w-full rounded-full bg-ocean-gradient py-2.5 text-sm font-bold text-white shadow-md transition hover:brightness-110"
                  >
                    Continue — enter details &amp; pay
                  </button>
                </div>
              ) : (
                <div className="hidden space-y-2 rounded-xl border border-cyan-200 bg-cyan-50 p-3 shadow-sm lg:block">
                  <p className="text-base font-bold text-ocean-900">
                    {promoApplied ? (
                      <>
                        <span className="text-sm font-semibold text-ocean-700 line-through">
                          ₹{subtotalInr.toLocaleString("en-IN")}
                        </span>{" "}
                        ₹{(cartFullAmountPaise / 100).toLocaleString("en-IN")}
                        <span className="mt-0.5 block text-[11px] font-normal text-green-800">
                          {promoApplied.title} ({promoApplied.discountPercent}%
                          off)
                        </span>
                      </>
                    ) : (
                      <>Cart total: ₹{subtotalInr.toLocaleString("en-IN")}</>
                    )}
                  </p>
                  {cartMinPayPaise < cartFullAmountPaise ? (
                    <>
                      <p className="text-xs text-ocean-700">
                        Min advance: ₹
                        {(cartMinPayPaise / 100).toLocaleString("en-IN")}
                      </p>
                      <div className="flex flex-col gap-1.5 text-xs">
                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="radio"
                            name="payModeBookingSidebar"
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
                            name="payModeBookingSidebar"
                            checked={payMode === "full"}
                            onChange={() => setPayMode("full")}
                          />
                          Pay full (₹
                          {(cartFullAmountPaise / 100).toLocaleString("en-IN")})
                        </label>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-ocean-700">
                      You’ll pay the full cart amount.
                    </p>
                  )}
                  {msg ? (
                    <p className="text-xs text-ocean-700" role="status">
                      {msg}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={pay}
                    disabled={busy}
                    className="w-full rounded-full bg-ocean-gradient py-2.5 text-sm font-semibold text-white shadow-md disabled:opacity-60"
                  >
                    {payButtonLabel}
                  </button>
                </div>
              )
            ) : null
          }
        />
      </div>
    </div>
  );
}
