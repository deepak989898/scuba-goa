"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { getDb } from "@/lib/firebase";

type Row = Record<string, unknown> & { id: string };

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
        <ul className="mt-8 space-y-4">
          {rows.map((r) => (
            <li
              key={r.id}
              className="rounded-2xl border border-ocean-100 bg-white p-4 text-sm shadow-sm"
            >
              <p className="font-semibold text-ocean-900">
                {String(r.packageName ?? "")}
              </p>
              <p className="text-ocean-700">
                {String(r.customerName ?? "")} · {String(r.phone ?? "")} ·{" "}
                {String(r.email ?? "")}
              </p>
              <p className="text-ocean-600">
                {String(r.date ?? "")} · {String(r.people ?? "")} pax · ₹
                {Number(r.amountPaise ?? 0) / 100}
              </p>
              <p className="text-xs text-ocean-500">
                Payment {String(r.razorpayPaymentId ?? r.id)} ·{" "}
                {String(r.createdAt ?? "")}
              </p>
              {Array.isArray(r.cartItems) && r.cartItems.length > 0 ? (
                <ul className="mt-3 border-t border-ocean-100 pt-3 text-xs text-ocean-700">
                  {(r.cartItems as Record<string, unknown>[]).map((it, idx) => (
                    <li key={idx}>
                      {String(it.name ?? "")} ×{String(it.quantity ?? "")} · ₹
                      {Number(it.lineTotal ?? 0).toLocaleString("en-IN")}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
