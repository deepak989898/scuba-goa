"use client";

import Link from "next/link";
import type { ServiceItem } from "@/data/services";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { ServiceMetaBlock } from "@/components/ServiceMetaBlock";
import { serviceHasPricedSubServices } from "@/lib/service-sub-helpers";

type Props = {
  service: ServiceItem;
};

export function ServiceDetailActions({ service: s }: Props) {
  const pricedSubsOnly = serviceHasPricedSubServices(s);

  return (
    <div className="mt-8 space-y-8">
      <div className="rounded-2xl border-2 border-ocean-600 bg-gradient-to-br from-amber-50 via-white to-cyan-50 p-6 shadow-md ring-1 ring-ocean-200/80">
        <p className="text-xs font-extrabold uppercase tracking-wider text-ocean-800">
          From
        </p>
        <p className="mt-1 font-display text-3xl font-extrabold tabular-nums text-ocean-950 md:text-4xl">
          ₹{s.priceFrom.toLocaleString("en-IN")}
          <span className="text-2xl font-bold text-cyan-700">+</span>
        </p>
      </div>
      <div className="rounded-2xl border border-ocean-100 bg-sand/80 p-6">
        <ServiceMetaBlock s={s} />
        {pricedSubsOnly ? (
          <p className="mt-4 text-sm text-ocean-600">
            Add to cart from an option below—each variant has its own price.
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-3">
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
          />
        ) : null}
        <Link
          href="/booking"
          className="inline-flex items-center rounded-full border-2 border-cyan-300/80 bg-ocean-gradient px-6 py-3 text-sm font-bold text-white shadow-lg shadow-ocean-950/35 transition hover:brightness-110"
        >
          Book this experience
        </Link>
        <Link
          href="/services"
          className="inline-flex items-center rounded-full border-2 border-ocean-200 bg-white px-6 py-3 text-sm font-bold text-ocean-900 shadow-sm transition hover:bg-ocean-50"
        >
          All services
        </Link>
      </div>
    </div>
  );
}
