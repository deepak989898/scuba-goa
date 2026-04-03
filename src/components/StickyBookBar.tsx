"use client";

import Link from "next/link";
import { MISSED_CALL_DISPLAY_LABEL, MISSED_CALL_TEL_HREF } from "@/lib/constants";
import { openLeadOfferPopup } from "@/lib/lead-offer-events";

/**
 * Mobile bottom bar: missed-call lead + ₹200 offer trigger + book CTA.
 */
export function StickyBookBar() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-[48] border-t border-white/15 bg-slate-950/92 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] backdrop-blur-md md:hidden">
      <div className="mx-auto max-w-lg space-y-1.5">
        <button
          type="button"
          onClick={() => openLeadOfferPopup()}
          className="min-h-11 w-full touch-manipulation rounded-lg bg-amber-500/95 py-2.5 text-center text-[11px] font-bold uppercase tracking-wide text-amber-950 shadow-sm active:opacity-90 active:scale-[0.99]"
        >
          Claim ₹200 OFF — WhatsApp code
        </button>
        <div className="grid grid-cols-2 gap-2">
          <a
            href={MISSED_CALL_TEL_HREF}
            className="flex min-h-12 touch-manipulation items-center justify-center rounded-full border-2 border-white/40 bg-white/10 px-2 text-center text-xs font-semibold text-white backdrop-blur-sm active:bg-white/20"
          >
            Ring once — callback
          </a>
          <Link
            href="/booking"
            className="flex min-h-12 touch-manipulation items-center justify-center rounded-full bg-ocean-gradient px-2 text-center text-sm font-bold text-white shadow-md active:opacity-90"
          >
            Lock my slot
          </Link>
        </div>
        <p className="pb-0.5 text-center text-[9px] leading-snug text-white/55">
          Free callback · {MISSED_CALL_DISPLAY_LABEL}
        </p>
      </div>
    </div>
  );
}
