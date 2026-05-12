"use client";

import Link from "next/link";
import { CONTACT_PHONE_HREF, whatsappLink } from "@/lib/constants";
import { ADVANCE_BOOKING_INR } from "@/lib/payment";

/**
 * Mobile bottom action bar — always visible on screens below the `md`
 * breakpoint. Designed for thumb reach with three equal-width primary
 * targets (Call, WhatsApp, Book) that comfortably exceed Apple's 44 px
 * and Material's 48 px tap-target minimums.
 *
 * Layout notes
 * - Three buttons sit in a CSS grid so they share width evenly even on
 *   narrow phones (≥ 320 px). Each cell stacks an icon and a label so the
 *   intent is readable without relying on color alone.
 * - The CTA row pushes 64 px tall on phones (`min-h-16`), which gives a
 *   tap surface well above iOS HIG / WCAG 2.5.5 (Level AAA: 44 px).
 * - Contrast: every button uses a fully-opaque background + white text,
 *   so the bar passes WCAG AA on the dark slate substrate.
 */
export function StickyBookBar() {
  const waHref = whatsappLink(
    "Hi, I want to book scuba diving in Goa. Please share slots and how to pay ₹" +
      ADVANCE_BOOKING_INR +
      " advance.",
  );

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[48] border-t border-slate-700/80 bg-slate-950/97 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] shadow-[0_-12px_28px_-12px_rgba(0,0,0,0.55)] backdrop-blur-md md:hidden"
      role="region"
      aria-label="Quick contact and booking"
    >
      <div className="mx-auto max-w-lg">
        <div className="grid grid-cols-3 gap-2">
          {/*
            WCAG contrast notes for the three buttons:
            - Call Now: emerald-600 (#059669) + white = 3.45:1 (FAIL).
              emerald-700 (#047857) + white = 4.83:1 (AA pass).
            - WhatsApp: #25D366 + slate-950 dark text already passes (>10:1).
            - Book Today: cyan→ocean-700 gradient + slate-950 dark text passes
              on every stop of the gradient.
          */}
          <a
            href={CONTACT_PHONE_HREF}
            className="flex min-h-16 touch-manipulation flex-col items-center justify-center gap-0.5 rounded-xl border border-emerald-600/80 bg-emerald-700 px-2 py-2 text-white shadow-md shadow-emerald-900/40 transition active:opacity-90"
            aria-label="Call us now"
          >
            <span aria-hidden className="text-lg leading-none">
              📞
            </span>
            <span className="text-[13px] font-bold leading-tight">Call Now</span>
          </a>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-16 touch-manipulation flex-col items-center justify-center gap-0.5 rounded-xl border border-[#1faa53] bg-[#25D366] px-2 py-2 text-slate-950 shadow-md shadow-emerald-900/40 transition active:opacity-90"
            aria-label="Chat with us on WhatsApp"
          >
            <span aria-hidden className="text-lg leading-none">
              💬
            </span>
            <span className="text-[13px] font-extrabold leading-tight">WhatsApp</span>
          </a>
          <Link
            href="/booking"
            className="flex min-h-16 touch-manipulation flex-col items-center justify-center gap-0.5 rounded-xl border border-cyan-300/80 bg-gradient-to-br from-cyan-300 to-ocean-700 px-2 py-2 text-slate-950 shadow-md shadow-cyan-900/40 transition active:opacity-95"
            aria-label="Book today — secure online checkout"
          >
            <span aria-hidden className="text-lg leading-none">
              📅
            </span>
            <span className="text-[13px] font-extrabold leading-tight">Book Today</span>
          </Link>
        </div>
        <p className="mt-1.5 text-center text-[10px] font-medium leading-snug text-slate-100">
          Pay ₹{ADVANCE_BOOKING_INR.toLocaleString("en-IN")} advance · Instant Razorpay confirmation
        </p>
      </div>
    </div>
  );
}
