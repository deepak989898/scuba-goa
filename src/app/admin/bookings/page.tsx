"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { getDb, getFirebaseAuth } from "@/lib/firebase";
import { customerWhatsappLink, SITE_NAME } from "@/lib/constants";

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

function buildWhatsappConfirmationMessage(r: Row): string {
  const name = String(r.customerName ?? "there");
  const pkg = String(r.packageName ?? "Your activity");
  const dateStr = formatTripDate(r.date);
  const paid = rupeesFromPaise(r.amountPaise);
  const ref = String(r.razorpayPaymentId ?? r.id);
  return [
    `Hi ${name},`,
    "",
    `Your booking with ${SITE_NAME} is confirmed.`,
    "",
    pkg,
    `Trip date: ${dateStr}`,
    `Amount paid: ${paid}`,
    `Payment reference: ${ref}`,
    "",
    "We can send your PDF bill by email, or please ask if you need it here.",
  ].join("\n");
}

export default function AdminBookingsPage() {
  const db = getDb();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);

  async function authorizedFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response | null> {
    const auth = getFirebaseAuth();
    const user = auth?.currentUser;
    if (!user) {
      setActionError("Sign in again to use bill actions.");
      return null;
    }
    const token = await user.getIdToken();
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${token}`);
    return fetch(input, { ...init, headers });
  }

  async function previewBill(paymentId: string) {
    setActionError(null);
    setActionSuccess(null);
    const res = await authorizedFetch(
      `/api/admin/booking-bill?paymentId=${encodeURIComponent(paymentId)}`
    );
    if (!res) return;
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      setActionError(j?.error ?? `Could not load bill (${res.status})`);
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
  }

  async function sendConfirmationEmail(paymentId: string) {
    setActionError(null);
    setActionSuccess(null);
    setSendingEmailId(paymentId);
    try {
      const res = await authorizedFetch("/api/admin/booking-send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId }),
      });
      if (!res) return;
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setActionError(j?.error ?? `Email failed (${res.status})`);
        return;
      }
      setActionSuccess("Confirmation email with bill attachment was sent.");
    } finally {
      setSendingEmailId(null);
    }
  }

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
      <p className="mt-2 text-sm text-ocean-600">
        Use <strong>Preview bill</strong> to check the PDF, then{" "}
        <strong>Send confirmation email</strong> (bill attached) or{" "}
        <strong>WhatsApp</strong> to message the guest (attach the PDF manually if
        you downloaded it from preview).
      </p>
      {actionError ? (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {actionError}
        </p>
      ) : null}
      {actionSuccess ? (
        <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {actionSuccess}
        </p>
      ) : null}
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

                <div className="mt-4 flex flex-wrap gap-2 border-t border-ocean-100 pt-4">
                  <button
                    type="button"
                    onClick={() => previewBill(r.id)}
                    className="rounded-full border border-ocean-200 bg-white px-4 py-2 text-xs font-semibold text-ocean-800 shadow-sm hover:bg-ocean-50"
                  >
                    Preview bill
                  </button>
                  <button
                    type="button"
                    disabled={sendingEmailId === r.id}
                    onClick={() => sendConfirmationEmail(r.id)}
                    className="rounded-full bg-ocean-800 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-ocean-900 disabled:opacity-50"
                  >
                    {sendingEmailId === r.id
                      ? "Sending…"
                      : "Send confirmation + bill (email)"}
                  </button>
                  {(() => {
                    const wa = customerWhatsappLink(
                      String(r.phone ?? ""),
                      buildWhatsappConfirmationMessage(r)
                    );
                    return wa ? (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100"
                      >
                        WhatsApp guest
                      </a>
                    ) : (
                      <span className="self-center text-xs text-ocean-500">
                        WhatsApp: add a valid phone on the booking
                      </span>
                    );
                  })()}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
