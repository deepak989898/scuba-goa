"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { getDb } from "@/lib/firebase";

type Row = Record<string, unknown> & { id: string };

function formatDateTimeAmPm(iso: unknown): string {
  if (iso == null || iso === "") return "—";
  const d = new Date(String(iso));
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatTripDate(raw: unknown): string {
  if (raw == null || raw === "") return "—";
  const s = String(raw).trim();
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T12:00:00` : s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function rupeesFromPaise(paise: unknown): string {
  const n = Number(paise);
  if (!Number.isFinite(n)) return "—";
  return `₹${(n / 100).toLocaleString("en-IN")}`;
}

export default function AdminBookingsPage() {
  const db = getDb();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    (async () => {
      const snap = await getDocs(collection(db, "bookings"));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Row));
      list.sort(
        (a, b) =>
          String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""))
      );
      setRows(list);
      setLoading(false);
    })();
  }, [db]);

  if (!db) {
    return (
      <p className="text-ocean-700">
        Firebase client not configured. Bookings appear after successful Razorpay
        verify + Admin SDK on the server.
      </p>
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-ocean-900">Bookings</h1>
      <p className="mt-2 text-sm text-ocean-600">
        Written by <code className="text-xs">/api/razorpay/verify</code> when{" "}
        <code className="text-xs">FIREBASE_SERVICE_ACCOUNT_KEY</code> is set.
      </p>
      {loading ? (
        <p className="mt-8 text-ocean-600">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-8 text-ocean-600">No bookings yet.</p>
      ) : (
        <ul className="mt-8 space-y-6">
          {rows.map((r) => {
            const people = Number(r.people ?? r.payUnits ?? 0);
            const fullPaise = Number(r.fullAmountPaise ?? r.amountPaise ?? 0);
            const paidPaise = Number(r.amountPaise ?? 0);
            const cartItems = Array.isArray(r.cartItems)
              ? (r.cartItems as Record<string, unknown>[])
              : [];

            return (
              <li
                key={r.id}
                className="rounded-2xl border border-ocean-100 bg-white p-5 text-sm shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-ocean-100 pb-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ocean-500">
                      Trip / package
                    </p>
                    <p className="mt-0.5 font-display text-lg font-semibold text-ocean-900">
                      {String(r.packageName ?? "—")}
                    </p>
                  </div>
                  <div className="text-right text-xs text-ocean-600">
                    <p className="font-medium text-ocean-800">Booking recorded</p>
                    <p>{formatDateTimeAmPm(r.createdAt)}</p>
                  </div>
                </div>

                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-ocean-500">
                      Guest name
                    </dt>
                    <dd className="mt-0.5 font-medium text-ocean-900">
                      {String(r.customerName ?? "—")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-ocean-500">
                      Phone
                    </dt>
                    <dd className="mt-0.5 text-ocean-800">{String(r.phone ?? "—")}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-ocean-500">
                      Email
                    </dt>
                    <dd className="mt-0.5 break-all text-ocean-800">
                      {String(r.email ?? "—")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-ocean-500">
                      Trip date
                    </dt>
                    <dd className="mt-0.5 text-ocean-800">
                      {formatTripDate(r.date)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-ocean-500">
                      Units / people
                    </dt>
                    <dd className="mt-0.5 text-ocean-800">
                      {Number.isFinite(people) && people > 0 ? people : "—"}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-ocean-500">
                      Pickup / address
                    </dt>
                    <dd className="mt-0.5 text-ocean-800">
                      {r.pickupLocation != null && String(r.pickupLocation).trim()
                        ? String(r.pickupLocation).trim()
                        : "—"}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 rounded-xl bg-ocean-50/80 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ocean-600">
                    Payment
                  </p>
                  <p className="mt-1 text-ocean-800">
                    <span className="font-medium">Paid:</span>{" "}
                    {rupeesFromPaise(r.amountPaise)}
                    {fullPaise > paidPaise ? (
                      <>
                        {" "}
                        <span className="text-ocean-600">
                          · Full order {rupeesFromPaise(r.fullAmountPaise)} · Balance{" "}
                          {rupeesFromPaise(r.balancePaise)}
                        </span>
                      </>
                    ) : null}
                  </p>
                  <p className="mt-1 text-xs text-ocean-600">
                    Mode: {String(r.paymentMode ?? "—")}
                    {r.razorpayPaymentId ? (
                      <> · Payment ID {String(r.razorpayPaymentId)}</>
                    ) : null}
                    {r.razorpayOrderId ? (
                      <> · Order {String(r.razorpayOrderId)}</>
                    ) : null}
                  </p>
                </div>

                {cartItems.length > 0 ? (
                  <div className="mt-4 border-t border-ocean-100 pt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ocean-500">
                      Cart lines
                    </p>
                    <ul className="mt-2 space-y-1.5 text-xs text-ocean-800">
                      {cartItems.map((it, idx) => (
                        <li
                          key={idx}
                          className="flex flex-wrap justify-between gap-2 rounded-lg bg-sand/60 px-2 py-1.5"
                        >
                          <span className="font-medium">
                            {String(it.name ?? "")} × {String(it.quantity ?? "")}
                          </span>
                          <span>
                            ₹{Number(it.lineTotal ?? 0).toLocaleString("en-IN")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
