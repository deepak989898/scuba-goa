"use client";

import Link from "next/link";
import { whatsappLink } from "@/lib/constants";
import { ADVANCE_BOOKING_INR } from "@/lib/payment";

/**
 * Mobile bottom bar: single primary CTA + one WhatsApp path (no extra decisions).
 */
export function StickyBookBar() {
  const wa = whatsappLink(
    "Hi, I want to book scuba diving in Goa. Please share slots and how to pay ₹" +
      ADVANCE_BOOKING_INR +
      " advance."
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[48] border-t border-slate-700 bg-slate-950 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] md:hidden">
      <div className="mx-auto max-w-lg space-y-2">
        <Link
          href="/booking"
          className="flex min-h-12 w-full touch-manipulation items-center justify-center rounded-xl bg-ocean-gradient px-3 py-3 text-center text-[13px] font-bold leading-snug text-white shadow-lg shadow-cyan-900/30 active:opacity-95"
        >
          Book now — pay ₹{ADVANCE_BOOKING_INR.toLocaleString("en-IN")} to lock
        </Link>
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-11 w-full touch-manipulation items-center justify-center rounded-xl border-2 border-emerald-500/80 bg-emerald-600/15 px-3 py-2.5 text-center text-[12px] font-semibold text-emerald-100 active:opacity-95"
        >
          WhatsApp booking
        </a>
        <p className="pb-0.5 text-center text-[9px] leading-snug text-slate-400">
          Razorpay checkout on the next screen · WhatsApp for quick questions
        </p>
      </div>
    </div>
  );
}
