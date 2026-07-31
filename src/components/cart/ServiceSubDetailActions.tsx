"use client";

import Link from "next/link";
import type { ServiceItem, SubServiceItem } from "@/data/services";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { whatsappLink } from "@/lib/constants";
import { encodeServiceSubOption } from "@/lib/booking-selection";
import { getSubServiceCartKey, isPricedSubService } from "@/lib/service-sub-helpers";

type Props = {
  service: ServiceItem;
  sub: SubServiceItem;
  index: number;
  layout?: "sidebar" | "inline";
};

export function ServiceSubDetailActions({
  service: s,
  sub,
  index,
  layout = "sidebar",
}: Props) {
  const subKey = getSubServiceCartKey(sub, index);
  const priced = isPricedSubService(sub);
  const lineTitle = `${s.title} — ${sub.title}`;
  // Always allow cart: prefer sub price, else parent starting price
  const price = priced ? sub.priceFrom! : s.priceFrom;
  const bookingHref = `/booking?opt=${encodeURIComponent(
    encodeServiceSubOption(s.slug, subKey),
  )}`;
  const wa = whatsappLink(
    `Hi, I want to book ${sub.title} (${s.title}) in Goa`,
  );

  const wrap =
    layout === "sidebar"
      ? "rounded-2xl border border-ocean-100 bg-sand/40 p-4 shadow-sm"
      : "rounded-xl border border-ocean-100 bg-ocean-50/50 p-3";

  return (
    <div className={wrap}>
      <p className="text-xs font-semibold uppercase tracking-wide text-ocean-500">
        Book this option
      </p>
      <p className="mt-1 font-display text-lg font-bold text-ocean-900">
        {sub.title}
      </p>
      {(sub.slotsLeft != null || sub.bookedToday != null) && (
        <p className="mt-1 text-sm font-semibold text-red-600">
          {sub.slotsLeft != null ? `${sub.slotsLeft} slots left` : null}
          {sub.slotsLeft != null && sub.bookedToday != null ? " · " : null}
          {sub.bookedToday != null ? `${sub.bookedToday} booked today` : null}
        </p>
      )}
      <div className="mt-2 rounded-xl border border-ocean-200 bg-gradient-to-br from-amber-50 via-white to-cyan-50 px-3 py-2">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-ocean-700">
          Starting at
        </p>
        <p className="font-display text-2xl font-extrabold tabular-nums leading-none text-ocean-950">
          ₹{price.toLocaleString("en-IN")}
          <span className="text-lg text-cyan-700">+</span>
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <AddToCartButton
          variant="service"
          slug={s.slug}
          title={lineTitle}
          priceFrom={price}
          subKey={subKey}
          image={s.image}
          duration={s.duration}
          includes={sub.includes ?? s.includes}
          rating={s.rating}
          slotsLeft={sub.slotsLeft ?? s.slotsLeft}
          bookedToday={sub.bookedToday ?? s.bookedToday}
          size="sm"
          className="min-w-[7.5rem] flex-1 justify-center"
        />
        <Link
          href={bookingHref}
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-cyan-500 px-4 py-2 text-sm font-extrabold text-slate-950 shadow-md transition hover:bg-cyan-400"
        >
          Book Now
        </Link>
      </div>
      <a
        href={wa}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-full border-2 border-emerald-600 bg-white px-4 py-2.5 text-center text-sm font-bold text-emerald-800 transition hover:bg-emerald-50"
      >
        WhatsApp enquiry
      </a>
    </div>
  );
}
