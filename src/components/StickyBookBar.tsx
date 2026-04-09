"use client";

import Link from "next/link";
import { MISSED_CALL_DISPLAY_LABEL, MISSED_CALL_TEL_HREF } from "@/lib/constants";
import { openLeadOfferPopup } from "@/lib/lead-offer-events";

/**
 * Mobile bottom bar: primary book-online CTA, secondary WhatsApp offer + missed call.
 */
export function StickyBookBar() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-[48] border-t border-slate-700 bg-slate-950 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] md:hidden">
      <div className="mx-auto max-w-lg space-y-2">
        <Link
          href="/booking"
          className="flex min-h-12 w-full touch-manipulation items-center justify-center rounded-xl bg-ocean-gradient px-3 py-3 text-center text-[13px] font-bold leading-snug text-white shadow-lg shadow-cyan-900/30 active:opacity-95"
        >
          Claim ₹200 off — book online now
        </Link>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => openLeadOfferPopup()}
            className="flex min-h-12 touch-manipulation items-center justify-center rounded-xl border-2 border-amber-400/90 bg-amber-400 px-2 text-center text-[11px] font-extrabold uppercase leading-tight tracking-wide text-amber-950 shadow-sm active:scale-[0.99] active:opacity-95"
          >
            WhatsApp code
          </button>
          <a
            href={MISSED_CALL_TEL_HREF}
            className="flex min-h-12 touch-manipulation items-center justify-center rounded-xl border-2 border-cyan-300/90 bg-cyan-50 px-2 text-center text-[11px] font-bold leading-snug text-slate-900 shadow-sm active:opacity-95"
          >
            Ring once — callback
          </a>
        </div>
        <p className="pb-0.5 text-center text-[9px] leading-snug text-slate-400">
          Secure online payment · WhatsApp is optional · {MISSED_CALL_DISPLAY_LABEL}
        </p>
      </div>
    </div>
  );
}
