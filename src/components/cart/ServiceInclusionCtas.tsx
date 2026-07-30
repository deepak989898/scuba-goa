"use client";

import Link from "next/link";
import type { ServiceItem } from "@/data/services";
import { ServiceCardAddToCart } from "@/components/cart/ServiceCardAddToCart";
import { encodeServiceBaseOption } from "@/lib/booking-selection";
import { buildHeroBookingHref } from "@/lib/hero-slide-booking";

type Props = {
  service: ServiceItem;
};

/** Inclusion heading + Book now / Add to cart on the service detail page. */
export function ServiceInclusionCtas({ service: s }: Props) {
  const bookHref = buildHeroBookingHref(encodeServiceBaseOption(s.slug));

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
      <h2 className="bg-gradient-to-r from-cyan-500 via-ocean-600 to-emerald-500 bg-clip-text font-display text-xl font-extrabold tracking-wide text-transparent sm:text-2xl">
        Inclusion
      </h2>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={bookHref}
          className="inline-flex min-h-10 touch-manipulation items-center justify-center rounded-full bg-cyan-500 px-4 py-2 text-sm font-extrabold text-slate-950 shadow-md shadow-cyan-900/30 transition hover:bg-cyan-400 active:bg-cyan-300"
        >
          Book now
        </Link>
        <ServiceCardAddToCart service={s} size="sm" />
      </div>
    </div>
  );
}
