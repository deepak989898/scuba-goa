"use client";

import type { ReactNode } from "react";
import Link from "next/link";

type PromoProps = {
  promoDraft: string;
  setPromoDraft: (v: string) => void;
  promoBusy: boolean;
  promoApplied: {
    code: string;
    title: string;
    discountPercent: number;
  } | null;
  onApply: () => void;
  onClear: () => void;
};

type Props = {
  promo: PromoProps;
  /** Cart total / continue / pay UI — above benefits, no image overlap */
  checkoutSlot?: ReactNode;
};

const BENEFITS = [
  {
    title: "No Hidden Charges",
    desc: "What you see is what you pay",
    color: "bg-sky-100 text-sky-700",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
        <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z" />
      </svg>
    ),
  },
  {
    title: "Flexible Booking",
    desc: "Easy reschedule & cancellation",
    color: "bg-cyan-100 text-cyan-700",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
        <path d="M12 6v3l4-4-4-4v3a8 8 0 11-8 8h2a6 6 0 106-6z" />
      </svg>
    ),
  },
  {
    title: "Best Price Guarantee",
    desc: "We match the best prices",
    color: "bg-amber-100 text-amber-700",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
        <path d="M12 1l3 5 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1 3-5z" />
      </svg>
    ),
  },
  {
    title: "24/7 Support",
    desc: "We're here to help you",
    color: "bg-emerald-100 text-emerald-700",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
        <path d="M4 4h16v12H7l-3 3V4zm3 5v2h10V9H7zm0 4v2h7v-2H7z" />
      </svg>
    ),
  },
] as const;

export function BookingSidePanel({ promo, checkoutSlot }: Props) {
  return (
    <aside className="space-y-3">
      <div className="rounded-xl bg-gradient-to-br from-pink-500 via-rose-500 to-orange-400 p-3.5 text-white shadow-md">
        <p className="text-sm font-bold sm:text-base">Have a Promo Code?</p>
        <p className="mt-0.5 text-[11px] text-white/90">
          Enter code for offers.{" "}
          <Link href="/offers" className="font-semibold underline underline-offset-2">
            See offers
          </Link>
        </p>
        <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            className="min-w-0 flex-1 rounded-lg border-0 bg-white px-3 py-2 text-sm font-medium text-ocean-900 placeholder:text-ocean-400 shadow-sm"
            placeholder="e.g. COUPLE10"
            value={promo.promoDraft}
            onChange={(e) => promo.setPromoDraft(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            disabled={
              promo.promoBusy || (!promo.promoApplied && !promo.promoDraft.trim())
            }
            onClick={promo.onApply}
            className="shrink-0 rounded-lg bg-amber-300 px-4 py-2 text-sm font-extrabold text-ocean-950 shadow-sm transition hover:bg-amber-200 disabled:opacity-50"
          >
            {promo.promoBusy ? "…" : promo.promoApplied ? "Applied" : "Apply"}
          </button>
        </div>
        {promo.promoApplied ? (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span>
              {promo.promoApplied.title} — {promo.promoApplied.discountPercent}% off
            </span>
            <button
              type="button"
              onClick={promo.onClear}
              className="rounded-full bg-white/20 px-2 py-0.5 underline"
            >
              Remove
            </button>
          </div>
        ) : null}
      </div>

      {checkoutSlot}

      <ul className="space-y-1.5 rounded-xl border border-ocean-100 bg-white p-3 shadow-sm">
        {BENEFITS.map((b) => (
          <li key={b.title} className="flex items-start gap-2.5">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${b.color}`}
            >
              {b.icon}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-ocean-900 sm:text-sm">{b.title}</p>
              <p className="text-[11px] text-ocean-600">{b.desc}</p>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
