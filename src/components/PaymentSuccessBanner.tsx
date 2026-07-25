"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  PAYMENT_CONFIRM_SESSION_KEY,
  type PaymentConfirmClient,
} from "@/lib/payment-confirmation";
import { whatsappLink } from "@/lib/constants";

export function PaymentSuccessBanner() {
  const sp = useSearchParams();
  const router = useRouter();
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<PaymentConfirmClient | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    if (sp.get("payment") !== "success") return;
    setOpen(true);
    try {
      const n = sessionStorage.getItem("paymentNotice");
      if (n) {
        setWarning(n);
        sessionStorage.removeItem("paymentNotice");
      }
      const raw = sessionStorage.getItem(PAYMENT_CONFIRM_SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PaymentConfirmClient;
        if (parsed?.paymentId && parsed?.orderId) {
          setConfirm(parsed);
        }
        sessionStorage.removeItem(PAYMENT_CONFIRM_SESSION_KEY);
      }
    } catch {
      /* ignore */
    }
    router.replace("/", { scroll: false });
  }, [sp, router]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const dismiss = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismiss]);

  const downloadInvoice = useCallback(async () => {
    const url = confirm?.invoiceDownloadUrl?.trim();
    if (!url) {
      setDownloadError(
        "Invoice link is not ready yet. Check your email, or contact support with your payment ID.",
      );
      return;
    }
    setDownloading(true);
    setDownloadError(null);
    try {
      const res = await fetch(url, { credentials: "omit" });
      if (!res.ok) {
        throw new Error(`Download failed (${res.status})`);
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `invoice-${(confirm?.paymentId ?? "booking").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 48)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      // Fallback: open the PDF URL (still downloadable via browser)
      try {
        window.open(url, "_blank", "noopener,noreferrer");
      } catch {
        setDownloadError(
          "Could not download the invoice. Open the link from your SMS/email, or contact support.",
        );
      }
    } finally {
      setDownloading(false);
    }
  }, [confirm]);

  if (!open) return null;

  const wa = whatsappLink(
    `Hi, I just paid on your website. Payment ID: ${confirm?.paymentId ?? "—"}. Please confirm my slot on WhatsApp.`,
  );

  const emailOk = confirm?.emailSent !== false;
  const smsOk = confirm?.smsSent === true;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close dialog backdrop"
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]"
        onClick={dismiss}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[101] w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl shadow-teal-900/25 ring-1 ring-teal-900/10"
      >
        <div className="relative bg-gradient-to-br from-teal-500 via-cyan-500 to-sky-500 px-5 pb-8 pt-5 text-white">
          <button
            ref={closeRef}
            type="button"
            onClick={dismiss}
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-xl leading-none text-white transition hover:bg-white/30"
            aria-label="Close"
          >
            ×
          </button>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/20 ring-2 ring-white/40">
            <svg
              viewBox="0 0 24 24"
              className="h-8 w-8"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2
            id={titleId}
            className="mt-4 text-center font-display text-xl font-bold tracking-tight sm:text-2xl"
          >
            Payment successful!
          </h2>
          <p className="mt-2 text-center text-sm text-white/95 sm:text-[15px]">
            Your booking is confirmed. We&apos;ve sent your confirmation and
            invoice to your email
            {smsOk ? " and SMS" : ""}. Please check your inbox (and spam folder
            if needed).
          </p>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="rounded-xl bg-gradient-to-br from-teal-50 to-cyan-50 px-4 py-3 text-sm text-teal-950 ring-1 ring-teal-200/80">
            <p className="font-semibold text-teal-900">
              Confirmation & invoice sent
            </p>
            <ul className="mt-2 space-y-1.5 text-[13px] text-teal-900/90">
              <li>
                Email:{" "}
                {emailOk
                  ? "Invoice PDF sent to your registered email"
                  : "Email may be delayed — keep your payment ID handy"}
              </li>
              <li>
                SMS:{" "}
                {smsOk
                  ? "Booking details + invoice link sent to your mobile"
                  : "SMS link may be unavailable; use Download Invoice below"}
              </li>
            </ul>
          </div>

          {confirm ? (
            <ul className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs text-slate-700 sm:text-sm">
              {confirm.packageName ? (
                <li>
                  <span className="font-semibold text-slate-900">Service:</span>{" "}
                  {confirm.packageName}
                </li>
              ) : null}
              <li>
                <span className="font-semibold text-slate-900">Paid now:</span> ₹
                {confirm.paidInr.toLocaleString("en-IN")}
                {confirm.paymentMode === "partial" ? (
                  <span className="text-slate-600">
                    {" "}
                    (advance) · Balance ₹
                    {confirm.balanceInr.toLocaleString("en-IN")}
                  </span>
                ) : null}
              </li>
              <li className="font-mono text-[11px] text-slate-600 sm:text-xs">
                Payment ID: {confirm.paymentId}
              </li>
              <li className="font-mono text-[11px] text-slate-600 sm:text-xs">
                Order: {confirm.orderId}
              </li>
            </ul>
          ) : null}

          {downloadError ? (
            <p className="text-xs text-amber-800">{downloadError}</p>
          ) : null}
          {warning ? (
            <p className="text-xs text-amber-800">{warning}</p>
          ) : null}

          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => void downloadInvoice()}
              disabled={downloading || !confirm?.invoiceDownloadUrl}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-5 text-sm font-bold text-white shadow-md shadow-teal-600/25 transition hover:from-teal-500 hover:to-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {downloading ? "Preparing PDF…" : "Download Invoice"}
            </button>
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#25D366] px-5 text-sm font-semibold text-white transition hover:opacity-95"
            >
              Chat on WhatsApp
            </a>
            <button
              type="button"
              onClick={dismiss}
              className="min-h-10 w-full text-sm font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
