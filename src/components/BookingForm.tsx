"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Script from "next/script";
import { usePackages } from "@/hooks/usePackages";
import { useServices } from "@/hooks/useServices";
import { getPricedSubServicesWithIndex } from "@/lib/service-sub-helpers";
import { SITE_NAME, whatsappLink } from "@/lib/constants";
import { attachRazorpayPaymentFailed } from "@/lib/razorpayCheckout";
import {
  computeMinPayPaise,
  MIN_PAYMENT_PER_PERSON_INR,
} from "@/lib/payment";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export function BookingForm() {
  const { packages, loading } = usePackages();
  const { services } = useServices();
  const searchParams = useSearchParams();
  const pre = searchParams.get("package");

  const [packageId, setPackageId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  const [people, setPeople] = useState(2);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  /** Pay minimum advance (₹500 per person) or full total */
  const [payMode, setPayMode] = useState<"min" | "full">("full");

  useEffect(() => {
    if (pre && packages.some((p) => p.id === pre)) setPackageId(pre);
  }, [pre, packages]);

  const selected = useMemo(
    () => packages.find((p) => p.id === packageId),
    [packages, packageId]
  );

  const packagesByCategory = useMemo(() => {
    const map = new Map<string, typeof packages>();
    for (const p of packages) {
      const key = p.category?.trim() || "Packages";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [packages]);

  const totalInr = selected ? selected.price * people : 0;
  const fullAmountPaise = Math.round(totalInr * 100);
  const minPayPaise = selected
    ? computeMinPayPaise(people, fullAmountPaise)
    : 0;
  const chargePaise =
    payMode === "full" || minPayPaise >= fullAmountPaise
      ? fullAmountPaise
      : minPayPaise;

  async function pay() {
    setMsg(null);
    if (!selected || !name.trim() || !email.trim() || !phone.trim() || !date) {
      setMsg("Fill all fields and pick a package.");
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
    setBusy(true);
    try {
      const orderRes = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: chargePaise,
          fullAmountPaise,
          payUnits: people,
          currency: "INR",
          receipt: `bk_${Date.now()}`,
        }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error ?? "Order failed");

      const options: Record<string, unknown> = {
        key,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.id,
        name: SITE_NAME,
        description: selected.name,
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
                  packageId: selected.id,
                  packageName: selected.name,
                  customerName: name,
                  email,
                  phone,
                  date,
                  people,
                  amountPaise: chargePaise,
                  fullAmountPaise,
                  payUnits: people,
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
      setMsg(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  }

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
          Pay with UPI, card, or netbanking. Pay minimum ₹{MIN_PAYMENT_PER_PERSON_INR.toLocaleString("en-IN")} per person or the full amount.
        </p>
        {loading ? (
          <p className="mt-6 text-sm text-ocean-600">Loading packages…</p>
        ) : (
          <div className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-ocean-800">
              Package
              <select
                className="mt-1 w-full rounded-xl border border-ocean-200 px-3 py-2.5 text-ocean-900"
                value={packageId}
                onChange={(e) => setPackageId(e.target.value)}
              >
                <option value="">Select…</option>
                {packagesByCategory.map(([category, list]) => (
                  <optgroup key={category} label={category}>
                    {list.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — ₹{p.price.toLocaleString("en-IN")}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <details className="rounded-xl border border-ocean-100 bg-ocean-50/50 p-3 text-sm">
              <summary className="cursor-pointer font-medium text-ocean-900">
                Packages &amp; service option prices
              </summary>
              <div className="mt-3 space-y-5 text-ocean-800">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ocean-500">
                    Package lineup
                  </p>
                  <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto pr-1">
                    {packages.map((p) => (
                      <li
                        key={p.id}
                        className="rounded-lg bg-white/90 p-2 ring-1 ring-ocean-100"
                      >
                        <p className="font-semibold text-ocean-900">
                          {p.name}{" "}
                          <span className="font-normal text-ocean-600">
                            — ₹{p.price.toLocaleString("en-IN")}
                          </span>
                        </p>
                        {p.includes.length > 0 ? (
                          <ul className="mt-1 list-inside list-disc text-xs text-ocean-600">
                            {p.includes.map((inc) => (
                              <li key={`${p.id}-${inc}`}>{inc}</li>
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
                {services.some((s) => getPricedSubServicesWithIndex(s).length > 0) ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ocean-500">
                      Service variants
                    </p>
                    <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto pr-1">
                      {services.map((s) => {
                        const priced = getPricedSubServicesWithIndex(s);
                        if (!priced.length) return null;
                        return (
                          <li
                            key={s.slug}
                            className="rounded-lg bg-white/90 p-2 ring-1 ring-ocean-100"
                          >
                            <p className="font-semibold text-ocean-900">{s.title}</p>
                            <ul className="mt-1 space-y-0.5 text-xs text-ocean-700">
                              {priced.map(({ sub }) => (
                                <li key={`${s.slug}-${sub.title}`}>
                                  <span className="font-medium">{sub.title}</span>
                                  <span className="text-ocean-600">
                                    {" "}
                                    — ₹{sub.priceFrom!.toLocaleString("en-IN")}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
              </div>
            </details>
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
              Date
              <input
                type="date"
                className="mt-1 w-full rounded-xl border border-ocean-200 px-3 py-2.5"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label className="block text-sm font-medium text-ocean-800">
              People
              <input
                type="number"
                min={1}
                max={20}
                className="mt-1 w-full rounded-xl border border-ocean-200 px-3 py-2.5"
                value={people}
                onChange={(e) => setPeople(Number(e.target.value))}
              />
            </label>
            {selected ? (
              <div className="space-y-3 rounded-xl border border-ocean-100 bg-sand/60 p-4">
                {selected.includes.length > 0 ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ocean-600">
                      Included with this package
                    </p>
                    <ul className="mt-1 list-inside list-disc text-sm text-ocean-700">
                      {selected.includes.map((inc) => (
                        <li key={inc}>{inc}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <p className="text-lg font-bold text-ocean-900">
                  Full total: ₹{(selected.price * people).toLocaleString("en-IN")}
                </p>
                {minPayPaise < fullAmountPaise ? (
                  <>
                    <p className="text-sm text-ocean-700">
                      Minimum advance: ₹{(minPayPaise / 100).toLocaleString("en-IN")}{" "}
                      ({MIN_PAYMENT_PER_PERSON_INR.toLocaleString("en-IN")} × {people}{" "}
                      {people === 1 ? "person" : "people"})
                    </p>
                    <div className="flex flex-wrap gap-3 text-sm">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name="payMode"
                          checked={payMode === "min"}
                          onChange={() => setPayMode("min")}
                          className="text-ocean-700"
                        />
                        Pay minimum (₹{(minPayPaise / 100).toLocaleString("en-IN")})
                      </label>
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name="payMode"
                          checked={payMode === "full"}
                          onChange={() => setPayMode("full")}
                        />
                        Pay full (₹{(fullAmountPaise / 100).toLocaleString("en-IN")})
                      </label>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-ocean-600">
                    Order total is below the per-person minimum; you’ll pay the full
                    amount.
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
              {busy
                ? "Processing…"
                : selected
                  ? `Pay ₹${(chargePaise / 100).toLocaleString("en-IN")} with Razorpay`
                  : "Pay securely with Razorpay"}
            </button>
            <a
              href={whatsappLink()}
              className="block w-full rounded-full border border-ocean-200 py-3 text-center text-sm font-semibold text-ocean-800"
            >
              Or chat on WhatsApp
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
