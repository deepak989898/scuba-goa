"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Script from "next/script";
import { usePackages } from "@/hooks/usePackages";
import { SITE_NAME, whatsappLink } from "@/lib/constants";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export function BookingForm() {
  const { packages, loading } = usePackages();
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

  useEffect(() => {
    if (pre && packages.some((p) => p.id === pre)) setPackageId(pre);
  }, [pre, packages]);

  const selected = useMemo(
    () => packages.find((p) => p.id === packageId),
    [packages, packageId]
  );

  const totalInr = selected ? selected.price * people : 0;
  const amountPaise = Math.round(totalInr * 100);

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
          amount: amountPaise,
          currency: "INR",
          receipt: `bk_${Date.now()}`,
        }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error ?? "Order failed");

      const options = {
        key,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.id,
        name: SITE_NAME,
        description: selected.name,
        prefill: { name, email, contact: phone },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
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
                amountPaise,
              },
            }),
          });
          const out = await v.json();
          if (!v.ok) {
            setMsg(out.error ?? "Verification failed");
            return;
          }
          setMsg("Payment successful! Redirecting to WhatsApp…");
          const wa = whatsappLink(
            `Hi, I paid for ${selected.name} on ${date} for ${people} people. Ref: ${response.razorpay_payment_id}`
          );
          window.location.href = wa;
        },
        theme: { color: "#0284c7" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Something went wrong");
    } finally {
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
          No login. Pay with UPI, card, or netbanking. Confirmation opens WhatsApp.
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
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — ₹{p.price.toLocaleString("en-IN")}
                  </option>
                ))}
              </select>
            </label>
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
              <p className="text-lg font-bold text-ocean-900">
                Total: ₹{(selected.price * people).toLocaleString("en-IN")}
              </p>
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
              {busy ? "Processing…" : "Pay securely with Razorpay"}
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
