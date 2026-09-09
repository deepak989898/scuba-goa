"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { collection, getDocs, type DocumentData } from "firebase/firestore";
import { getDb, getFirebaseAuth } from "@/lib/firebase";
import { customerWhatsappLink, SITE_NAME } from "@/lib/constants";

type Row = Record<string, unknown> & { id: string };

type ServiceOption = { slug: string; title: string };

function defaultTripDateValue(): string {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

type EditFormState = {
  paymentId: string;
  customerName: string;
  phone: string;
  email: string;
  serviceSlug: string;
  customService: string;
  hotel: string;
  date: string;
  people: string;
  fullAmountInr: string;
  advanceInr: string;
  notes: string;
};

function formatDateInputValue(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = dateFromUnknown(raw);
  if (!d) return defaultTripDateValue();
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function rowToEditForm(r: Row, serviceOptions: ServiceOption[]): EditFormState {
  const fullInr = Math.round(
    Number(r.fullAmountPaise ?? r.amountPaise ?? 0) / 100,
  );
  const advanceInr = Math.round(Number(r.amountPaise ?? 0) / 100);
  const pkgName = String(r.packageName ?? "").trim();
  const storedSlug = String(r.serviceSlug ?? "").trim();
  let serviceSlug = storedSlug;
  if (!serviceSlug) {
    const match = serviceOptions.find(
      (s) =>
        pkgName === s.title ||
        pkgName.startsWith(`${s.title} `) ||
        pkgName.includes(s.title),
    );
    serviceSlug = match?.slug ?? (pkgName ? "__custom" : "");
  }
  if (
    serviceSlug &&
    serviceSlug !== "__custom" &&
    !serviceOptions.some((s) => s.slug === serviceSlug)
  ) {
    serviceSlug = "__custom";
  }

  return {
    paymentId: r.id,
    customerName: String(r.customerName ?? ""),
    phone: String(r.phone ?? ""),
    email: String(r.email ?? ""),
    serviceSlug: serviceSlug || serviceOptions[0]?.slug || "__custom",
    customService:
      serviceSlug === "__custom" || !storedSlug ? pkgName : "",
    hotel: String(r.pickupLocation ?? ""),
    date: formatDateInputValue(r.date),
    people: String(Math.max(1, Number(r.people ?? r.payUnits ?? 1))),
    fullAmountInr: fullInr > 0 ? String(fullInr) : "",
    advanceInr: advanceInr > 0 ? String(advanceInr) : "",
    notes: String(r.notes ?? ""),
  };
}

function dateFromUnknown(raw: unknown): Date | null {
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw;
  if (raw && typeof raw === "object") {
    const timestamp = raw as {
      toDate?: () => Date;
      seconds?: number;
      _seconds?: number;
    };
    if (typeof timestamp.toDate === "function") {
      const date = timestamp.toDate();
      return Number.isNaN(date.getTime()) ? null : date;
    }
    const seconds = timestamp.seconds ?? timestamp._seconds;
    if (typeof seconds === "number") {
      const date = new Date(seconds * 1000);
      return Number.isNaN(date.getTime()) ? null : date;
    }
  }
  if (raw == null || raw === "") return null;
  const date = new Date(String(raw));
  return Number.isNaN(date.getTime()) ? null : date;
}

function istDayKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function formatBookingDay(date: Date): string {
  const key = istDayKey(date);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86_400_000);
  const prefix =
    key === istDayKey(today)
      ? "Today"
      : key === istDayKey(yesterday)
        ? "Yesterday"
        : date.toLocaleDateString("en-IN", {
            timeZone: "Asia/Kolkata",
            weekday: "long",
          });
  const dateLabel = date.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `${prefix} · ${dateLabel}`;
}

function formatDateTimeAmPm(iso: unknown): string {
  const d = dateFromUnknown(iso);
  if (!d) return iso == null || iso === "" ? "—" : String(iso);
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Show text in the auxiliary window when WhatsApp redirect cannot run. */
function writeAuxWindowHtml(w: Window, title: string, bodyHtml: string) {
  try {
    w.document.open();
    w.document.write(
      `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${escapeHtml(title)}</title></head><body style="font-family:system-ui,sans-serif;padding:2rem;max-width:28rem;margin:0 auto;line-height:1.5;color:#0f172a">${bodyHtml}</body></html>`
    );
    w.document.close();
  } catch {
    /* ignore */
  }
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
  const [billPreviewUrl, setBillPreviewUrl] = useState<string | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualBusy, setManualBusy] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [manualForm, setManualForm] = useState({
    customerName: "",
    phone: "",
    email: "",
    serviceSlug: "",
    customService: "",
    hotel: "",
    date: defaultTripDateValue(),
    people: "1",
    fullAmountInr: "",
    advanceInr: "",
    sendEmail: true,
    notes: "",
  });
  /** Day keys open in the list — newest day starts expanded. */
  const [openDayKeys, setOpenDayKeys] = useState<Set<string>>(new Set());
  const daysInitializedRef = useRef(false);
  const billPreviewUrlRef = useRef<string | null>(null);

  const closeBillPreview = useCallback(() => {
    if (billPreviewUrlRef.current) {
      URL.revokeObjectURL(billPreviewUrlRef.current);
      billPreviewUrlRef.current = null;
    }
    setBillPreviewUrl(null);
  }, []);

  useEffect(() => () => closeBillPreview(), [closeBillPreview]);

  useEffect(() => {
    if (!billPreviewUrl && !editForm) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (editForm) setEditForm(null);
      else closeBillPreview();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [billPreviewUrl, editForm, closeBillPreview]);

  function openEditBooking(r: Row) {
    setActionError(null);
    setActionSuccess(null);
    setEditForm(rowToEditForm(r, serviceOptions));
  }

  async function saveBookingEdit(andPreview = false) {
    if (!editForm) return false;
    setActionError(null);
    setActionSuccess(null);
    setEditBusy(true);
    const paymentId = editForm.paymentId;
    try {
      const service =
        serviceOptions.find((s) => s.slug === editForm.serviceSlug) ?? null;
      const serviceName =
        editForm.serviceSlug === "__custom"
          ? editForm.customService.trim()
          : service?.title ?? editForm.customService.trim();

      const res = await authorizedFetch("/api/admin/booking-update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: editForm.paymentId,
          customerName: editForm.customerName.trim(),
          phone: editForm.phone.trim(),
          email: editForm.email.trim(),
          serviceSlug:
            editForm.serviceSlug && editForm.serviceSlug !== "__custom"
              ? editForm.serviceSlug
              : undefined,
          serviceName,
          packageName: serviceName,
          hotel: editForm.hotel.trim(),
          date: editForm.date,
          people: Number(editForm.people) || 1,
          fullAmountInr: Number(editForm.fullAmountInr),
          advanceInr: Number(editForm.advanceInr),
          notes: editForm.notes.trim() || undefined,
        }),
      });
      if (!res) return;
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        packageName?: string;
      } | null;
      if (!res.ok) {
        setActionError(data?.error ?? `Could not update booking (${res.status})`);
        return false;
      }

      setActionSuccess(
        `Booking updated${data?.packageName ? `: ${data.packageName}` : ""}.${andPreview ? " Opening bill preview…" : " Preview bill to see the new invoice."}`,
      );
      setEditForm(null);
      await reloadBookings();
      if (andPreview) {
        void previewBill(paymentId);
      }
      return true;
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Could not update booking.",
      );
      return false;
    } finally {
      setEditBusy(false);
    }
  }

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
    const token = await user.getIdToken(true);
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${token}`);
    return fetch(input, { ...init, headers });
  }

  async function previewBill(paymentId: string) {
    setActionError(null);
    setActionSuccess(null);
    closeBillPreview();

    setPreviewLoadingId(paymentId);
    try {
      const res = await authorizedFetch(
        `/api/admin/booking-bill?paymentId=${encodeURIComponent(paymentId)}`
      );
      if (!res) return;

      const buf = await res.arrayBuffer();
      if (!res.ok) {
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
        setActionError("Server did not return a PDF. Check Vercel env and admin login.");
        return;
      }

      if (buf.byteLength < 100) {
        setActionError("Bill PDF was empty. Check server logs and FIREBASE_SERVICE_ACCOUNT_KEY.");
        return;
      }

      const blob = new Blob([buf], { type: "application/pdf" });
      const objectUrl = URL.createObjectURL(blob);
      billPreviewUrlRef.current = objectUrl;
      setBillPreviewUrl(objectUrl);
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Network error while loading the bill."
      );
    } finally {
      setPreviewLoadingId(null);
    }
  }

  async function openWhatsappGuestWithBill(r: Row) {
    setActionError(null);
    setActionSuccess(null);
    const phone = String(r.phone ?? "");
    if (!customerWhatsappLink(phone, " ")) {
      setActionError("Add a valid guest phone number on this booking for WhatsApp.");
      return;
    }

    // Do NOT pass noopener/noreferrer: many browsers return null from window.open()
    // while still opening a tab, so w.location is never set and the tab stays blank.
    const w = window.open("", "_blank");
    if (!w) {
      setActionError(
        "Your browser blocked the new tab. Allow pop-ups for this site and try again."
      );
      return;
    }

    writeAuxWindowHtml(
      w,
      "WhatsApp",
      "<p><strong>Preparing bill link…</strong></p><p style=\"font-size:0.875rem;color:#64748b\">You will be redirected to WhatsApp shortly.</p>"
    );

    setWhatsAppLoadingId(r.id);
    try {
      const res = await authorizedFetch("/api/admin/booking-bill-share-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: r.id }),
      });
      if (!res) {
        setActionError("Sign in again to use bill actions.");
        try {
          w.close();
        } catch {
          /* ignore */
        }
        return;
      }
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        billUrl?: string;
      } | null;
      if (!res.ok || !data?.billUrl) {
        const err = data?.error ?? `Could not create bill link (${res.status})`;
        setActionError(err);
        writeAuxWindowHtml(
          w,
          "Bill link",
          `<p><strong>Could not create bill link</strong></p><p style="font-size:0.875rem">${escapeHtml(err)}</p><p style="font-size:0.875rem;color:#64748b">You can close this tab and check the message on the admin page.</p>`
        );
        return;
      }
      const message = buildWhatsappConfirmationMessage(r, data.billUrl);
      const wa = customerWhatsappLink(phone, message);
      if (!wa) {
        setActionError("Invalid phone number for WhatsApp.");
        try {
          w.close();
        } catch {
          /* ignore */
        }
        return;
      }
      try {
        w.location.assign(wa);
      } catch {
        const fallback = window.open(wa, "_blank");
        if (fallback) {
          try {
            w.close();
          } catch {
            /* ignore */
          }
        } else {
          setActionError(
            "Could not open WhatsApp. Copy the bill link from Preview bill or try another browser."
          );
          writeAuxWindowHtml(
            w,
            "WhatsApp",
            `<p><strong>Open this link manually</strong></p><p style="word-break:break-all;font-size:0.8rem"><a href="${escapeHtml(wa)}">${escapeHtml(wa)}</a></p>`
          );
        }
      }
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Network error while creating the bill link.";
      setActionError(msg);
      writeAuxWindowHtml(
        w,
        "Error",
        `<p><strong>Something went wrong</strong></p><p style="font-size:0.875rem">${escapeHtml(msg)}</p>`
      );
    } finally {
      setWhatsAppLoadingId(null);
    }
  }

  const reloadBookings = useCallback(async () => {
    if (!db) return;
    const snap = await getDocs(collection(db, "bookings"));
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Row));
    list.sort(
      (a, b) =>
        (dateFromUnknown(b.createdAt)?.getTime() ?? 0) -
        (dateFromUnknown(a.createdAt)?.getTime() ?? 0),
    );
    setRows(list);
  }, [db]);

  async function createManualBooking() {
    setActionError(null);
    setActionSuccess(null);
    setManualBusy(true);
    try {
      const service =
        serviceOptions.find((s) => s.slug === manualForm.serviceSlug) ?? null;
      const serviceName =
        manualForm.serviceSlug === "__custom"
          ? manualForm.customService.trim()
          : service?.title ?? manualForm.customService.trim();

      const res = await authorizedFetch("/api/admin/manual-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: manualForm.customerName.trim(),
          phone: manualForm.phone.trim(),
          email: manualForm.email.trim(),
          serviceSlug:
            manualForm.serviceSlug && manualForm.serviceSlug !== "__custom"
              ? manualForm.serviceSlug
              : undefined,
          serviceName,
          hotel: manualForm.hotel.trim(),
          date: manualForm.date,
          people: Number(manualForm.people) || 1,
          fullAmountInr: Number(manualForm.fullAmountInr),
          advanceInr: Number(manualForm.advanceInr),
          sendEmail: manualForm.sendEmail,
          notes: manualForm.notes.trim() || undefined,
        }),
      });
      if (!res) return;
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        bookingId?: string;
        emailSent?: boolean;
        emailError?: string;
        packageName?: string;
      } | null;
      if (!res.ok) {
        setActionError(data?.error ?? `Could not create booking (${res.status})`);
        return;
      }

      const bookingId = data?.bookingId ?? "";
      let msg = `Manual booking created${data?.packageName ? `: ${data.packageName}` : ""}.`;
      if (manualForm.sendEmail) {
        msg += data?.emailSent
          ? " Invoice emailed to guest."
          : ` Email failed${data?.emailError ? `: ${data.emailError}` : ""} — use Preview bill.`;
      } else {
        msg += " Use Preview bill to send invoice.";
      }
      setActionSuccess(msg);

      setManualForm({
        customerName: "",
        phone: "",
        email: "",
        serviceSlug: serviceOptions[0]?.slug ?? "",
        customService: "",
        hotel: "",
        date: defaultTripDateValue(),
        people: "1",
        fullAmountInr: "",
        advanceInr: "",
        sendEmail: true,
        notes: "",
      });
      setManualOpen(false);
      await reloadBookings();
      if (bookingId) {
        void previewBill(bookingId);
      }
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Could not create manual booking.",
      );
    } finally {
      setManualBusy(false);
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
      const [bookingSnap, serviceSnap] = await Promise.all([
        getDocs(collection(db, "bookings")),
        getDocs(collection(db, "services")),
      ]);
      const list = bookingSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Row));
      list.sort(
        (a, b) =>
          (dateFromUnknown(b.createdAt)?.getTime() ?? 0) -
          (dateFromUnknown(a.createdAt)?.getTime() ?? 0),
      );
      setRows(list);

      const services = serviceSnap.docs
        .map((d) => {
          const data = d.data() as DocumentData;
          const title = String(data.title ?? d.id).trim();
          if (!title) return null;
          if (data.active === false) return null;
          return { slug: d.id, title };
        })
        .filter((s): s is ServiceOption => Boolean(s))
        .sort((a, b) => a.title.localeCompare(b.title));
      setServiceOptions(services);
      if (services.length > 0 && !manualForm.serviceSlug) {
        setManualForm((prev) => ({ ...prev, serviceSlug: services[0]!.slug }));
      }
      setLoading(false);
    })();
  }, [db]);

  const groupedRows = useMemo(() => {
    const groups = new Map<
      string,
      { key: string; label: string; rows: Row[] }
    >();
    for (const row of rows) {
      const created = dateFromUnknown(row.createdAt);
      const key = created ? istDayKey(created) : "unknown";
      const existing = groups.get(key);
      if (existing) {
        existing.rows.push(row);
      } else {
        groups.set(key, {
          key,
          label: created ? formatBookingDay(created) : "Date unavailable",
          rows: [row],
        });
      }
    }
    return Array.from(groups.values());
  }, [rows]);

  useEffect(() => {
    if (daysInitializedRef.current || groupedRows.length === 0) return;
    daysInitializedRef.current = true;
    setOpenDayKeys(new Set([groupedRows[0]!.key]));
  }, [groupedRows]);

  function toggleDay(key: string) {
    setOpenDayKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-base font-bold text-ocean-900">Bookings</h1>
        <button
          type="button"
          onClick={() => setManualOpen((v) => !v)}
          className="rounded-full bg-ocean-gradient px-3 py-1.5 text-xs font-semibold text-white"
        >
          {manualOpen ? "Hide manual booking" : "+ Manual booking"}
        </button>
      </div>

      {manualOpen ? (
        <section className="mt-3 rounded-xl border border-ocean-200 bg-white p-3 shadow-sm">
          <h2 className="font-display text-sm font-bold text-ocean-900">
            Create manual booking &amp; invoice
          </h2>
          <p className="mt-1 text-[11px] text-ocean-600">
            For walk-in, phone, or hotel desk bookings. Saves to the list, generates
            PDF bill, and can email the guest.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <label className="text-xs text-ocean-800">
              Guest name *
              <input
                className="mt-1 w-full rounded-lg border border-ocean-200 px-2.5 py-1.5"
                value={manualForm.customerName}
                onChange={(e) =>
                  setManualForm((f) => ({ ...f, customerName: e.target.value }))
                }
              />
            </label>
            <label className="text-xs text-ocean-800">
              Mobile number *
              <input
                className="mt-1 w-full rounded-lg border border-ocean-200 px-2.5 py-1.5"
                inputMode="tel"
                value={manualForm.phone}
                onChange={(e) =>
                  setManualForm((f) => ({ ...f, phone: e.target.value }))
                }
              />
            </label>
            <label className="text-xs text-ocean-800">
              Email (for invoice)
              <input
                type="email"
                className="mt-1 w-full rounded-lg border border-ocean-200 px-2.5 py-1.5"
                value={manualForm.email}
                onChange={(e) =>
                  setManualForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </label>
            <label className="text-xs text-ocean-800">
              Trip date *
              <input
                type="date"
                className="mt-1 w-full rounded-lg border border-ocean-200 px-2.5 py-1.5"
                value={manualForm.date}
                onChange={(e) =>
                  setManualForm((f) => ({ ...f, date: e.target.value }))
                }
              />
            </label>
            <label className="text-xs text-ocean-800 sm:col-span-2">
              Service / activity *
              <select
                className="mt-1 w-full rounded-lg border border-ocean-200 px-2.5 py-1.5"
                value={manualForm.serviceSlug}
                onChange={(e) =>
                  setManualForm((f) => ({ ...f, serviceSlug: e.target.value }))
                }
              >
                {serviceOptions.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.title}
                  </option>
                ))}
                <option value="__custom">Other (type below)</option>
              </select>
            </label>
            {manualForm.serviceSlug === "__custom" ? (
              <label className="text-xs text-ocean-800 sm:col-span-2">
                Custom service name *
                <input
                  className="mt-1 w-full rounded-lg border border-ocean-200 px-2.5 py-1.5"
                  placeholder="e.g. North Goa Tour + Scuba combo"
                  value={manualForm.customService}
                  onChange={(e) =>
                    setManualForm((f) => ({ ...f, customService: e.target.value }))
                  }
                />
              </label>
            ) : null}
            <label className="text-xs text-ocean-800 sm:col-span-2">
              Hotel / pickup location *
              <input
                className="mt-1 w-full rounded-lg border border-ocean-200 px-2.5 py-1.5"
                placeholder="Hotel name, area, or full address"
                value={manualForm.hotel}
                onChange={(e) =>
                  setManualForm((f) => ({ ...f, hotel: e.target.value }))
                }
              />
            </label>
            <label className="text-xs text-ocean-800">
              People
              <input
                type="number"
                min={1}
                max={99}
                className="mt-1 w-full rounded-lg border border-ocean-200 px-2.5 py-1.5"
                value={manualForm.people}
                onChange={(e) =>
                  setManualForm((f) => ({ ...f, people: e.target.value }))
                }
              />
            </label>
            <label className="text-xs text-ocean-800">
              Full amount (INR) *
              <input
                type="number"
                min={1}
                className="mt-1 w-full rounded-lg border border-ocean-200 px-2.5 py-1.5"
                value={manualForm.fullAmountInr}
                onChange={(e) =>
                  setManualForm((f) => ({ ...f, fullAmountInr: e.target.value }))
                }
              />
            </label>
            <label className="text-xs text-ocean-800">
              Advance paid (INR) *
              <input
                type="number"
                min={1}
                className="mt-1 w-full rounded-lg border border-ocean-200 px-2.5 py-1.5"
                value={manualForm.advanceInr}
                onChange={(e) =>
                  setManualForm((f) => ({ ...f, advanceInr: e.target.value }))
                }
              />
            </label>
            <label className="text-xs text-ocean-800 sm:col-span-2">
              Notes (optional)
              <input
                className="mt-1 w-full rounded-lg border border-ocean-200 px-2.5 py-1.5"
                value={manualForm.notes}
                onChange={(e) =>
                  setManualForm((f) => ({ ...f, notes: e.target.value }))
                }
              />
            </label>
          </div>
          <label className="mt-3 flex items-center gap-2 text-xs font-medium text-ocean-800">
            <input
              type="checkbox"
              checked={manualForm.sendEmail}
              onChange={(e) =>
                setManualForm((f) => ({ ...f, sendEmail: e.target.checked }))
              }
            />
            Email invoice PDF to guest (needs valid email above)
          </label>
          <button
            type="button"
            disabled={manualBusy}
            onClick={() => void createManualBooking()}
            className="mt-3 rounded-full bg-emerald-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {manualBusy ? "Creating…" : "Create booking & generate invoice"}
          </button>
        </section>
      ) : null}

      {actionError ? (
        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-800">
          {actionError}
        </p>
      ) : null}
      {actionSuccess ? (
        <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-900">
          {actionSuccess}
        </p>
      ) : null}
      {loading ? (
        <p className="mt-2 text-sm text-ocean-700">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-2 text-sm text-ocean-700">No bookings yet.</p>
      ) : (
        <div className="mt-2 space-y-1.5">
          <p className="text-[11px] text-ocean-600">
            Click a date → bookings → details.{" "}
            <span className="font-semibold text-teal-700">Date</span>
            {" · "}
            <span className="font-semibold text-amber-700">Service</span>
            {" · "}
            <span className="font-semibold text-emerald-700">Paid</span>
          </p>
          {groupedRows.map((group) => {
            const dayOpen = openDayKeys.has(group.key);
            return (
              <section
                key={group.key}
                aria-labelledby={`booking-day-${group.key}`}
                className="overflow-hidden rounded-lg border border-teal-200 bg-white shadow-sm"
              >
                <button
                  type="button"
                  id={`booking-day-${group.key}`}
                  aria-expanded={dayOpen}
                  onClick={() => toggleDay(group.key)}
                  className="flex w-full items-center justify-between gap-2 bg-gradient-to-r from-teal-50 to-cyan-50 px-2.5 py-2 text-left transition hover:from-teal-100/80 hover:to-cyan-100/80 sm:px-3"
                >
                  <span className="font-display text-sm font-extrabold text-teal-900 sm:text-base">
                    {group.label}
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <span className="rounded-full bg-teal-600 px-2 py-0.5 text-[10px] font-bold text-white">
                      {group.rows.length}{" "}
                      {group.rows.length === 1 ? "booking" : "bookings"}
                    </span>
                    <span
                      aria-hidden
                      className={`flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-bold text-teal-800 shadow-sm transition ${
                        dayOpen ? "rotate-180 bg-teal-100" : ""
                      }`}
                    >
                      ⌄
                    </span>
                  </span>
                </button>

                {dayOpen ? (
                  <ul className="space-y-1.5 border-t border-teal-100 bg-slate-50/80 px-1.5 py-1.5 sm:px-2">
                    {group.rows.map((r) => {
                      const people = Number(r.people ?? r.payUnits ?? 0);
                      const fullPaise = Number(r.fullAmountPaise ?? r.amountPaise ?? 0);
                      const paidPaise = Number(r.amountPaise ?? 0);
                      const cartItems = Array.isArray(r.cartItems)
                        ? (r.cartItems as Record<string, unknown>[])
                        : [];

                      return (
                        <li key={r.id}>
                          <details className="group overflow-hidden rounded-lg border border-ocean-100 bg-white text-xs shadow-sm open:border-amber-300 open:ring-1 open:ring-amber-100">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-2.5 py-1.5 marker:hidden transition hover:bg-amber-50/50 sm:px-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                  <p className="truncate font-display text-sm font-extrabold text-amber-800 sm:text-[15px]">
                                    {String(r.packageName ?? "—")}
                                  </p>
                                  {r.source === "manual" ? (
                                    <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-violet-800">
                                      Manual
                                    </span>
                                  ) : null}
                                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-800">
                                    Paid {rupeesFromPaise(r.amountPaise)}
                                  </span>
                                </div>
                                <div className="mt-0.5 flex flex-wrap gap-x-2.5 gap-y-0.5 text-[11px]">
                                  <span className="font-semibold text-ocean-900">
                                    {String(r.customerName ?? "Guest")}
                                  </span>
                                  <span className="font-medium text-violet-700">
                                    Trip: {formatTripDate(r.date)}
                                  </span>
                                  <span className="font-medium text-teal-700">
                                    Recorded: {formatDateTimeAmPm(r.createdAt)}
                                  </span>
                                </div>
                              </div>
                              <div className="flex shrink-0 items-center gap-1">
                                <span className="hidden text-[10px] font-bold text-amber-800 sm:inline group-open:hidden">
                                  Details
                                </span>
                                <span className="hidden text-[10px] font-bold text-amber-800 group-open:sm:inline">
                                  Hide
                                </span>
                                <span
                                  aria-hidden
                                  className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-50 text-sm font-bold text-amber-900 transition group-open:rotate-180 group-open:bg-amber-100"
                                >
                                  ⌄
                                </span>
                              </div>
                            </summary>

                            <div className="border-t border-amber-100 px-2.5 pb-2.5 pt-2 sm:px-3">
                              <dl className="grid gap-x-3 gap-y-1.5 sm:grid-cols-2">
                                <div className="rounded-md bg-sky-50/80 px-2 py-1">
                                  <dt className="text-[10px] font-extrabold uppercase tracking-wide text-sky-700">
                                    Guest name
                                  </dt>
                                  <dd className="mt-0.5 text-xs font-semibold text-ocean-900">
                                    {String(r.customerName ?? "—")}
                                  </dd>
                                </div>
                                <div className="rounded-md bg-sky-50/80 px-2 py-1">
                                  <dt className="text-[10px] font-extrabold uppercase tracking-wide text-sky-700">
                                    Phone
                                  </dt>
                                  <dd className="mt-0.5 text-xs font-medium text-ocean-900">
                                    {String(r.phone ?? "—")}
                                  </dd>
                                </div>
                                <div className="rounded-md bg-violet-50/80 px-2 py-1 sm:col-span-2">
                                  <dt className="text-[10px] font-extrabold uppercase tracking-wide text-violet-700">
                                    Email
                                  </dt>
                                  <dd className="mt-0.5 break-all text-xs font-medium text-ocean-900">
                                    {String(r.email ?? "—")}
                                  </dd>
                                </div>
                                <div className="rounded-md bg-violet-50/70 px-2 py-1">
                                  <dt className="text-[10px] font-extrabold uppercase tracking-wide text-violet-700">
                                    Trip date
                                  </dt>
                                  <dd className="mt-0.5 text-xs font-bold text-violet-900">
                                    {formatTripDate(r.date)}
                                  </dd>
                                </div>
                                <div className="rounded-md bg-cyan-50/80 px-2 py-1">
                                  <dt className="text-[10px] font-extrabold uppercase tracking-wide text-cyan-700">
                                    Units / people
                                  </dt>
                                  <dd className="mt-0.5 text-xs font-semibold text-ocean-900">
                                    {Number.isFinite(people) && people > 0 ? people : "—"}
                                  </dd>
                                </div>
                                <div className="rounded-md bg-orange-50/70 px-2 py-1 sm:col-span-2">
                                  <dt className="text-[10px] font-extrabold uppercase tracking-wide text-orange-700">
                                    Pickup / address
                                  </dt>
                                  <dd className="mt-0.5 text-xs font-medium text-ocean-900">
                                    {r.pickupLocation != null &&
                                    String(r.pickupLocation).trim()
                                      ? String(r.pickupLocation).trim()
                                      : "—"}
                                  </dd>
                                </div>
                              </dl>

                              <div className="mt-1.5 rounded-md border border-emerald-200 bg-emerald-50/90 px-2 py-1.5">
                                <p className="text-[10px] font-extrabold uppercase tracking-wide text-emerald-800">
                                  Payment
                                </p>
                                <p className="mt-0.5 text-xs text-emerald-950">
                                  <span className="font-bold">Paid:</span>{" "}
                                  {rupeesFromPaise(r.amountPaise)}
                                  {fullPaise > paidPaise ? (
                                    <>
                                      {" "}
                                      <span>
                                        · Full {rupeesFromPaise(r.fullAmountPaise)} ·
                                        Balance {rupeesFromPaise(r.balancePaise)}
                                      </span>
                                    </>
                                  ) : null}
                                </p>
                                <p className="mt-0.5 text-[10px] text-emerald-900/80">
                                  Mode: {String(r.paymentMode ?? "—")}
                                  {r.source === "manual" ? (
                                    <> · Ref {String(r.manualBookingRef ?? r.id)}</>
                                  ) : null}
                                  {r.razorpayPaymentId ? (
                                    <> · Pay {String(r.razorpayPaymentId)}</>
                                  ) : null}
                                  {r.razorpayOrderId ? (
                                    <> · Ord {String(r.razorpayOrderId)}</>
                                  ) : null}
                                </p>
                              </div>

                              {cartItems.length > 0 ? (
                                <div className="mt-1.5 border-t border-ocean-100 pt-1.5">
                                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-amber-700">
                                    Cart lines
                                  </p>
                                  <ul className="mt-1 space-y-0.5 text-[11px] text-ocean-800">
                                    {cartItems.map((it, idx) => (
                                      <li
                                        key={idx}
                                        className="flex flex-wrap justify-between gap-1 rounded bg-amber-50/80 px-1.5 py-1"
                                      >
                                        <span className="font-semibold text-amber-900">
                                          {String(it.name ?? "")} × {String(it.quantity ?? "")}
                                        </span>
                                        <span className="font-bold text-emerald-800">
                                          ₹
                                          {Number(it.lineTotal ?? 0).toLocaleString("en-IN")}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}

                              <div className="mt-1.5 flex flex-wrap gap-1.5 border-t border-ocean-100 pt-1.5">
                                <button
                                  type="button"
                                  onClick={() => openEditBooking(r)}
                                  className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-900 hover:bg-violet-100"
                                >
                                  Edit invoice
                                </button>
                                <button
                                  type="button"
                                  disabled={previewLoadingId === r.id}
                                  onClick={() => previewBill(r.id)}
                                  className="rounded-full border border-ocean-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-ocean-800 hover:bg-ocean-50 disabled:opacity-50"
                                >
                                  {previewLoadingId === r.id
                                    ? "Loading…"
                                    : "Preview bill"}
                                </button>
                                <button
                                  type="button"
                                  disabled={
                                    sendingEmailId === r.id ||
                                    !String(r.email ?? "").includes("@")
                                  }
                                  title={
                                    String(r.email ?? "").includes("@")
                                      ? undefined
                                      : "Add guest email to send invoice"
                                  }
                                  onClick={() => sendConfirmationEmail(r.id)}
                                  className="rounded-full bg-ocean-800 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-ocean-900 disabled:opacity-50"
                                >
                                  {sendingEmailId === r.id
                                    ? "Sending…"
                                    : "Email bill"}
                                </button>
                                <button
                                  type="button"
                                  disabled={whatsAppLoadingId === r.id}
                                  onClick={() => openWhatsappGuestWithBill(r)}
                                  className="rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
                                >
                                  {whatsAppLoadingId === r.id
                                    ? "Preparing…"
                                    : "WhatsApp guest"}
                                </button>
                              </div>
                            </div>
                          </details>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </section>
            );
          })}
        </div>
      )}

      {editForm ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-3"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-booking-title"
          onClick={() => !editBusy && setEditForm(null)}
        >
          <div
            className="max-h-[min(92vh,900px)] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-ocean-100 bg-white px-4 py-3">
              <p
                id="edit-booking-title"
                className="font-display font-semibold text-ocean-900"
              >
                Edit booking &amp; invoice
              </p>
              <button
                type="button"
                disabled={editBusy}
                onClick={() => setEditForm(null)}
                className="rounded-full border border-ocean-200 px-3 py-1 text-xs font-semibold text-ocean-800 hover:bg-ocean-50 disabled:opacity-50"
              >
                Close
              </button>
            </div>
            <div className="p-4">
              <p className="text-[11px] text-ocean-600">
                Changes update the booking record and the PDF invoice (guest name,
                trip, pickup, service, and payment amounts).
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <label className="text-xs text-ocean-800 sm:col-span-2">
                  Guest name *
                  <input
                    className="mt-1 w-full rounded-lg border border-ocean-200 px-2.5 py-1.5"
                    value={editForm.customerName}
                    onChange={(e) =>
                      setEditForm((f) =>
                        f ? { ...f, customerName: e.target.value } : f,
                      )
                    }
                  />
                </label>
                <label className="text-xs text-ocean-800">
                  Mobile number *
                  <input
                    className="mt-1 w-full rounded-lg border border-ocean-200 px-2.5 py-1.5"
                    inputMode="tel"
                    value={editForm.phone}
                    onChange={(e) =>
                      setEditForm((f) => (f ? { ...f, phone: e.target.value } : f))
                    }
                  />
                </label>
                <label className="text-xs text-ocean-800">
                  Email
                  <input
                    type="email"
                    className="mt-1 w-full rounded-lg border border-ocean-200 px-2.5 py-1.5"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm((f) => (f ? { ...f, email: e.target.value } : f))
                    }
                  />
                </label>
                <label className="text-xs text-ocean-800">
                  Trip date *
                  <input
                    type="date"
                    className="mt-1 w-full rounded-lg border border-ocean-200 px-2.5 py-1.5"
                    value={editForm.date}
                    onChange={(e) =>
                      setEditForm((f) => (f ? { ...f, date: e.target.value } : f))
                    }
                  />
                </label>
                <label className="text-xs text-ocean-800">
                  People *
                  <input
                    type="number"
                    min={1}
                    max={99}
                    className="mt-1 w-full rounded-lg border border-ocean-200 px-2.5 py-1.5"
                    value={editForm.people}
                    onChange={(e) =>
                      setEditForm((f) => (f ? { ...f, people: e.target.value } : f))
                    }
                  />
                </label>
                <label className="text-xs text-ocean-800 sm:col-span-2">
                  Service / activity *
                  <select
                    className="mt-1 w-full rounded-lg border border-ocean-200 px-2.5 py-1.5"
                    value={editForm.serviceSlug}
                    onChange={(e) =>
                      setEditForm((f) =>
                        f ? { ...f, serviceSlug: e.target.value } : f,
                      )
                    }
                  >
                    {serviceOptions.map((s) => (
                      <option key={s.slug} value={s.slug}>
                        {s.title}
                      </option>
                    ))}
                    <option value="__custom">Other (type below)</option>
                  </select>
                </label>
                {editForm.serviceSlug === "__custom" ? (
                  <label className="text-xs text-ocean-800 sm:col-span-2">
                    Custom service name *
                    <input
                      className="mt-1 w-full rounded-lg border border-ocean-200 px-2.5 py-1.5"
                      value={editForm.customService}
                      onChange={(e) =>
                        setEditForm((f) =>
                          f ? { ...f, customService: e.target.value } : f,
                        )
                      }
                    />
                  </label>
                ) : null}
                <label className="text-xs text-ocean-800 sm:col-span-2">
                  Hotel / pickup location *
                  <input
                    className="mt-1 w-full rounded-lg border border-ocean-200 px-2.5 py-1.5"
                    value={editForm.hotel}
                    onChange={(e) =>
                      setEditForm((f) => (f ? { ...f, hotel: e.target.value } : f))
                    }
                  />
                </label>
                <label className="text-xs text-ocean-800">
                  Full amount (INR) *
                  <input
                    type="number"
                    min={1}
                    className="mt-1 w-full rounded-lg border border-ocean-200 px-2.5 py-1.5"
                    value={editForm.fullAmountInr}
                    onChange={(e) =>
                      setEditForm((f) =>
                        f ? { ...f, fullAmountInr: e.target.value } : f,
                      )
                    }
                  />
                </label>
                <label className="text-xs text-ocean-800">
                  Advance paid (INR) *
                  <input
                    type="number"
                    min={1}
                    className="mt-1 w-full rounded-lg border border-ocean-200 px-2.5 py-1.5"
                    value={editForm.advanceInr}
                    onChange={(e) =>
                      setEditForm((f) =>
                        f ? { ...f, advanceInr: e.target.value } : f,
                      )
                    }
                  />
                </label>
                <label className="text-xs text-ocean-800 sm:col-span-2">
                  Notes (optional)
                  <input
                    className="mt-1 w-full rounded-lg border border-ocean-200 px-2.5 py-1.5"
                    value={editForm.notes}
                    onChange={(e) =>
                      setEditForm((f) => (f ? { ...f, notes: e.target.value } : f))
                    }
                  />
                </label>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={editBusy}
                  onClick={() => void saveBookingEdit(false)}
                  className="rounded-full bg-violet-700 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-800 disabled:opacity-50"
                >
                  {editBusy ? "Saving…" : "Save changes"}
                </button>
                <button
                  type="button"
                  disabled={editBusy}
                  onClick={() => void saveBookingEdit(true)}
                  className="rounded-full border border-ocean-200 bg-white px-4 py-2 text-xs font-semibold text-ocean-800 hover:bg-ocean-50 disabled:opacity-50"
                >
                  Save &amp; preview bill
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {billPreviewUrl ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-3 sm:p-3"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bill-preview-title"
          onClick={closeBillPreview}
        >
          <div
            className="flex h-[min(90vh,900px)] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-2 border-b border-ocean-100 px-4 py-3">
              <p
                id="bill-preview-title"
                className="font-display font-semibold text-ocean-900"
              >
                Bill preview
              </p>
              <div className="flex flex-wrap gap-2">
                <a
                  href={billPreviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-ocean-200 px-3 py-1.5 text-xs font-semibold text-ocean-800 hover:bg-ocean-50"
                >
                  Open in new tab
                </a>
                <a
                  href={billPreviewUrl}
                  download="booking-bill.pdf"
                  className="rounded-full border border-ocean-200 px-3 py-1.5 text-xs font-semibold text-ocean-800 hover:bg-ocean-50"
                >
                  Download
                </a>
                <button
                  type="button"
                  onClick={closeBillPreview}
                  className="rounded-full bg-ocean-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-ocean-900"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="relative min-h-0 flex-1 bg-ocean-50/50">
              <iframe
                key={billPreviewUrl}
                src={`${billPreviewUrl}#view=FitH`}
                title="Booking bill PDF"
                className="absolute inset-0 h-full w-full border-0"
              />
            </div>
            <p className="flex-shrink-0 border-t border-ocean-100 px-4 py-2 text-center text-xs text-ocean-700">
              If the preview is blank, use <strong>Open in new tab</strong> or{" "}
              <strong>Download</strong>.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
