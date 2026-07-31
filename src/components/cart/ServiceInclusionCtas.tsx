"use client";

import Link from "next/link";
import type { ServiceItem } from "@/data/services";
import { ServiceCardAddToCart } from "@/components/cart/ServiceCardAddToCart";
import { encodeServiceBaseOption } from "@/lib/booking-selection";
import { buildHeroBookingHref } from "@/lib/hero-slide-booking";

type Props = {
  service: ServiceItem;
};

const bookNowClass =
  "inline-flex min-h-10 touch-manipulation items-center justify-center rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-5 py-2 text-sm font-extrabold text-white shadow-lg shadow-orange-500/40 ring-2 ring-amber-200/70 transition hover:brightness-110 active:brightness-95";

/** Override solid cart styles with a cool ocean gradient (distinct from Book now). */
const addToCartClass =
  "!min-h-10 !border-0 !bg-gradient-to-r !from-teal-500 !via-cyan-600 !to-ocean-800 !px-5 !py-2 !text-sm !font-extrabold !text-white !shadow-lg !shadow-cyan-700/40 ring-2 ring-cyan-300/60 hover:!brightness-110 active:!brightness-95";

/** Inclusion heading + Book now / Add to cart (hidden when packages/sub-services exist). */
export function ServiceInclusionCtas({ service: s }: Props) {
  const hasSubServices = Boolean(s.subServices?.length);
  const bookHref = buildHeroBookingHref(encodeServiceBaseOption(s.slug));

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
      <h2 className="bg-gradient-to-r from-cyan-500 via-ocean-600 to-emerald-500 bg-clip-text font-display text-xl font-extrabold tracking-wide text-transparent sm:text-2xl">
        Inclusion
      </h2>
      {!hasSubServices ? (
        <div className="flex flex-wrap items-center gap-2">
          <Link href={bookHref} className={bookNowClass}>
            Book now
          </Link>
          <ServiceCardAddToCart
            service={s}
            size="sm"
            className={addToCartClass}
          />
        </div>
      ) : null}
    </div>
  );
}
