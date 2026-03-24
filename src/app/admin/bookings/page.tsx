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

function buildWhatsappConfirmationMessage(r: Row, billPdfUrl?: string): string {
  const name = String(r.customerName ?? "there");
  const pkg = String(r.packageName ?? "Your activity");
  const dateStr = formatTripDate(r.date);
  const paid = rupeesFromPaise(r.amountPaise);
  const ref = String(r.razorpayPaymentId ?? r.id);
  const lines = [
    `Hi ${name},`,
    "",
    `Your booking with ${SITE_NAME} is confirmed.`,
    "",
    pkg,
    `Trip date: ${dateStr}`,
    `Amount paid: ${paid}`,
    `Payment reference: ${ref}`,
    "",
  ];
  if (billPdfUrl) {
    lines.push("Download your PDF bill (link expires in a few days):");
    lines.push(billPdfUrl);
  }
  return lines.join("\n");
}

export default function AdminBookingsPage() {
  const db = getDb();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [whatsAppLoadingId, setWhatsAppLoadingId] = useState<string | null>(null);

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
    // Open a tab in the same user gesture; after `await` a new window.open is often blocked.
    const preview = window.open("about:blank", "_blank", "noopener,noreferrer");
    if (!preview) {
      setActionError(
        "Your browser blocked the preview tab. Allow pop-ups for this site and try again."
      );
      return;
    }

    const res = await authorizedFetch(
      `/api/admin/booking-bill?paymentId=${encodeURIComponent(paymentId)}`
    );
    if (!res) {
      preview.close();
      return;
    }

    const buf = await res.arrayBuffer();
    if (!res.ok) {
      preview.close();
      const text = new TextDecoder().decode(buf.slice(0, 2000));
      let msg = `Could not load bill (${res.status})`;
      try {
        const j = JSON.parse(text) as { error?: string };
        if (j?.error) msg = j.error;
      } catch {
        /* ignore */
      }
      setActionError(msg);
      return;
    }

    const ct = res.headers.get("content-type") ?? "";
    const head = new Uint8Array(buf, 0, Math.min(4, buf.byteLength));
    const pdfMagic =
      head.length >= 4 &&
      head[0] === 0x25 &&
      head[1] === 0x50 &&
      head[2] === 0x44 &&
      head[3] === 0x46; /* %PDF */
    if (!pdfMagic && !ct.includes("application/pdf")) {
      preview.close();
      setActionError("Server did not return a PDF. Check Vercel env and admin login.");
      return;
    }

    // Blob URLs must be created on the *preview* window — opener-created URLs often
    // fail to load in the other tab (blank page).
    const blob = new Blob([buf], { type: "application/pdf" });
    const pw = preview as unknown as Window & { URL: typeof URL };
    const objectUrl = pw.URL.createObjectURL(blob);
    preview.location.href = objectUrl;
    pw.setTimeout(() => pw.URL.revokeObjectURL(objectUrl), 120_000);
  }

  async function openWhatsappGuestWithBill(r: Row) {
    setActionError(null);
    setActionSuccess(null);
    const phone = String(r.phone ?? "");
    if (!customerWhatsappLink(phone, " ")) {
      setActionError("Add a valid guest phone number on this booking for WhatsApp.");
      return;
    }

    const w = window.open("about:blank", "_blank", "noopener,noreferrer");
    if (!w) {
      setActionError(
        "Your browser blocked the new tab. Allow pop-ups for this site and try again."
      );
      return;
    }

    setWhatsAppLoadingId(r.id);
    try {
      const res = await authorizedFetch("/api/admin/booking-bill-share-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: r.id }),
      });
      if (!res) {
        w.close();
        return;
      }
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        billUrl?: string;
      } | null;
      if (!res.ok || !data?.billUrl) {
        w.close();
        setActionError(data?.error ?? `Could not create bill link (${res.status})`);
        return;
      }
      const message = buildWhatsappConfirmationMessage(r, data.billUrl);
      const wa = customerWhatsappLink(phone, message);
      if (!wa) {
        w.close();
        setActionError("Invalid phone number for WhatsApp.");
        return;
      }
      w.location.href = wa;
    } finally {
      setWhatsAppLoadingId(null);
    }
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
        <strong>WhatsApp guest</strong> — the message includes a{" "}
        <strong>time-limited link</strong> that opens the same PDF (WhatsApp cannot
        attach files from a website button). On Vercel, add{" "}
        <code className="text-xs">FIREBASE_SERVICE_ACCOUNT_KEY</code> (full service
        account JSON) so APIs can read bookings — Razorpay keys are{" "}
        <strong>not</strong> used to generate the preview. Set{" "}
        <code className="text-xs">NEXT_PUBLIC_SITE_URL</code> for correct WhatsApp
        links; optional <code className="text-xs">BOOKING_BILL_SHARE_SECRET</code>{" "}
        (or Razorpay secret) for signing share links.
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
                  <button
                    type="button"
                    disabled={whatsAppLoadingId === r.id}
                    onClick={() => openWhatsappGuestWithBill(r)}
                    className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
                  >
                    {whatsAppLoadingId === r.id
                      ? "Preparing WhatsApp…"
                      : "WhatsApp guest + bill link"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
