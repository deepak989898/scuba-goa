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
      <div className="rounded-2xl border border-ocean-100 bg-sand/80 p-6">
        <p className="text-2xl font-bold text-ocean-900">
          From ₹{s.priceFrom.toLocaleString("en-IN")}+
        </p>
        <div className="mt-4">
          <ServiceMetaBlock s={s} />
        </div>
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
          className="inline-flex items-center rounded-full bg-ocean-gradient px-6 py-3 text-sm font-semibold text-white shadow-md"
        >
          Book this experience
        </Link>
        <Link
          href="/services"
          className="inline-flex items-center rounded-full border border-ocean-200 px-6 py-3 text-sm font-semibold text-ocean-800"
        >
          All services
        </Link>
      </div>
    </div>
  );
}
