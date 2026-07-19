"use client";

import Link from "next/link";
import type { ServiceItem } from "@/data/services";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { ServiceCardAddToCart } from "@/components/cart/ServiceCardAddToCart";
import { ServiceMetaBlock } from "@/components/ServiceMetaBlock";
import { serviceHasPricedSubServices } from "@/lib/service-sub-helpers";

type Props = {
  service: ServiceItem;
  /** Compact sticky sidebar card (default) vs inline row under content */
  layout?: "sidebar" | "inline";
};

export function ServiceDetailActions({
  service: s,
  layout = "sidebar",
}: Props) {
  const pricedSubsOnly = serviceHasPricedSubServices(s);

  if (layout === "inline") {
    return (
      <div className="mt-5 flex flex-wrap gap-2">
        {!pricedSubsOnly ? (
          <AddToCartButton
            variant="service"
            slug={s.slug}
            title={s.title}
            priceFrom={s.priceFrom}
            image={s.image}
            duration={s.duration}
            includes={s.includes}
            rating={s.rating}
            slotsLeft={s.slotsLeft}
            bookedToday={s.bookedToday}
            size="sm"
          />
        ) : null}
        <Link
          href="/booking"
          className="inline-flex min-h-10 items-center rounded-full border-2 border-cyan-300/80 bg-ocean-gradient px-5 py-2 text-sm font-bold text-white shadow-md shadow-ocean-950/30 transition hover:brightness-110"
        >
          Book this experience
        </Link>
        <Link
          href="/services"
          className="inline-flex min-h-10 items-center rounded-full border-2 border-ocean-200 bg-white px-5 py-2 text-sm font-bold text-ocean-900 shadow-sm transition hover:bg-ocean-50"
        >
          All services
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-ocean-200 bg-white p-3.5 shadow-sm ring-1 ring-ocean-100/80">
      <ServiceMetaBlock s={s} />
      <div className="mt-2.5 flex items-end justify-between gap-2 rounded-xl border border-ocean-200 bg-gradient-to-br from-amber-50 via-white to-cyan-50 px-3 py-2">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-ocean-700">
            Starting at
          </p>
          <p className="font-display text-2xl font-extrabold tabular-nums leading-none text-ocean-950">
            ₹{s.priceFrom.toLocaleString("en-IN")}
            <span className="text-lg text-cyan-700">+</span>
          </p>
        </div>
      </div>
      {pricedSubsOnly ? (
        <p className="mt-2 text-xs text-ocean-700">
          Pick a priced option below—or add a variant from the menu.
        </p>
      ) : null}
      <div className="mt-2.5 flex flex-wrap gap-2">
        {pricedSubsOnly ? (
          <ServiceCardAddToCart service={s} size="sm" />
        ) : (
          <AddToCartButton
            variant="service"
            slug={s.slug}
            title={s.title}
            priceFrom={s.priceFrom}
            image={s.image}
            duration={s.duration}
            includes={s.includes}
            rating={s.rating}
            slotsLeft={s.slotsLeft}
            bookedToday={s.bookedToday}
            size="sm"
          />
        )}
        <Link
          href="/booking"
          className="inline-flex min-h-10 flex-1 items-center justify-center rounded-full bg-cyan-500 px-4 py-2 text-sm font-extrabold text-slate-950 shadow-md transition hover:bg-cyan-400"
        >
          See &amp; book
        </Link>
      </div>
    </div>
  );
}
