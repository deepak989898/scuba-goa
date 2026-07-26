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
  const price = priced ? sub.priceFrom! : s.priceFrom;
  const bookingHref = priced
    ? `/booking?opt=${encodeURIComponent(encodeServiceSubOption(s.slug, subKey))}`
    : `/services/${s.slug}`;
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
      <p className="mt-1 font-display text-xl font-extrabold tabular-nums text-ocean-950">
        {priced ? (
          <>
            ₹{price.toLocaleString("en-IN")}
            <span className="ml-1 text-sm font-semibold text-ocean-600">
              from
            </span>
          </>
        ) : (
          <span className="text-base font-semibold text-ocean-700">
            See parent service for live pricing
          </span>
        )}
      </p>

      <div className="mt-3 flex flex-col gap-2">
        {priced ? (
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
            size="md"
            className="w-full justify-center"
          />
        ) : null}
        <Link
          href={bookingHref}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-500 px-4 py-2.5 text-center text-sm font-extrabold text-slate-950 shadow-md transition hover:bg-cyan-400"
        >
          {priced ? "Book now" : `View ${s.title}`}
        </Link>
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center justify-center rounded-full border-2 border-emerald-600 bg-white px-4 py-2.5 text-center text-sm font-bold text-emerald-800 transition hover:bg-emerald-50"
        >
          WhatsApp enquiry
        </a>
      </div>
    </div>
  );
}
