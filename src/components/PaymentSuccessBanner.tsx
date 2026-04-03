"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  PAYMENT_CONFIRM_SESSION_KEY,
  type PaymentConfirmClient,
} from "@/lib/payment-confirmation";
import { whatsappLink } from "@/lib/constants";

export function PaymentSuccessBanner() {
  const sp = useSearchParams();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<PaymentConfirmClient | null>(null);

  useEffect(() => {
    if (sp.get("payment") !== "success") return;
    setVisible(true);
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

  if (!visible) return null;

  const wa = whatsappLink(
    `Hi, I just paid on your website. Payment ID: ${confirm?.paymentId ?? "—"}. Please confirm my slot on WhatsApp.`
  );

  return (
    <div className="border-b border-emerald-200 bg-gradient-to-r from-emerald-50 via-ocean-50 to-cyan-50 px-4 py-4 text-center text-sm text-ocean-900">
      <p className="font-display text-base font-bold text-emerald-900 sm:text-lg">
        Booking confirmed — payment successful
      </p>
      <p className="mt-1 text-ocean-800">
        Instant confirmation: your Razorpay payment went through. Keep your payment
        ID handy; our team will align slot & pickup on{" "}
        <strong className="text-ocean-900">WhatsApp</strong> shortly.
      </p>
      {confirm ? (
        <ul className="mx-auto mt-3 max-w-lg space-y-1 rounded-xl border border-ocean-200/80 bg-white/80 px-4 py-3 text-left text-xs text-ocean-800 sm:text-sm">
          <li>
            <span className="font-semibold text-ocean-900">Paid now:</span> ₹
            {confirm.paidInr.toLocaleString("en-IN")}
            {confirm.paymentMode === "partial" ? (
              <span className="text-ocean-600">
                {" "}
                (advance) · Balance ₹{confirm.balanceInr.toLocaleString("en-IN")} on
                full booking ₹{confirm.fullInr.toLocaleString("en-IN")}
              </span>
            ) : null}
          </li>
          <li className="font-mono text-[11px] text-ocean-700 sm:text-xs">
            Payment ID: {confirm.paymentId}
          </li>
          <li className="font-mono text-[11px] text-ocean-600 sm:text-xs">
            Order: {confirm.orderId}
          </li>
        </ul>
      ) : (
        <p className="mt-2 text-xs text-ocean-600">
          Confirmation details loaded when verify API returns; check email / WhatsApp
          if this box is empty.
        </p>
      )}
      <a
        href={wa}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex min-h-11 items-center justify-center rounded-full bg-[#25D366] px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-95"
      >
        Send WhatsApp confirmation
      </a>
      <p className="mt-3 text-xs text-ocean-600">
        Email with PDF bill is sent when outgoing mail is configured on the server.
      </p>
      {warning ? (
        <p className="mt-2 text-left text-xs text-amber-900 md:mx-auto md:max-w-2xl">
          {warning}
        </p>
      ) : null}
    </div>
  );
}
