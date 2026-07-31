"use client";

import Link from "next/link";
import type { ServiceItem } from "@/data/services";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { ServiceCardAddToCart } from "@/components/cart/ServiceCardAddToCart";
import { ServiceMetaBlock } from "@/components/ServiceMetaBlock";
import { encodeServiceBaseOption } from "@/lib/booking-selection";
import { buildHeroBookingHref } from "@/lib/hero-slide-booking";
import { serviceHasPricedSubServices } from "@/lib/service-sub-helpers";

type Props = {
  service: ServiceItem;
  /** Compact sticky sidebar card (default) vs inline row under content */
  layout?: "sidebar" | "inline";
};

const bookGradientClass =
  "inline-flex min-h-10 flex-1 touch-manipulation items-center justify-center rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-4 py-2 text-sm font-extrabold text-white shadow-lg shadow-orange-500/35 ring-2 ring-amber-200/70 transition hover:brightness-110 active:brightness-95";

const cartGradientClass =
  "!min-h-10 !border-0 !bg-gradient-to-r !from-teal-500 !via-cyan-600 !to-ocean-800 !px-4 !py-2 !text-sm !font-extrabold !text-white !shadow-lg !shadow-cyan-700/35 ring-2 ring-cyan-300/50 hover:!brightness-110 active:!brightness-95";

export function ServiceDetailActions({
  service: s,
  layout = "sidebar",
}: Props) {
  const pricedSubsOnly = serviceHasPricedSubServices(s);
  const bookHref = buildHeroBookingHref(encodeServiceBaseOption(s.slug));

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
          href={bookHref}
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
    <div className="relative overflow-hidden rounded-2xl border-2 border-amber-300/90 bg-gradient-to-br from-amber-200 via-yellow-100 to-orange-100 p-3.5 shadow-lg shadow-amber-400/30 ring-2 ring-amber-200/80">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br from-yellow-300/70 to-orange-300/40 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-10 -left-6 h-24 w-24 rounded-full bg-gradient-to-tr from-amber-400/40 to-rose-300/30 blur-2xl"
      />

      <div className="relative">
        <p className="mb-1 font-display text-xs font-extrabold uppercase tracking-wider text-amber-900/80">
          Ready to book?
        </p>
        <ServiceMetaBlock s={s} />

        <div className="mt-2.5 flex items-end justify-between gap-2 rounded-xl border-2 border-amber-400/70 bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 px-3 py-2.5 shadow-inner shadow-amber-200/50">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800">
              Starting at
            </p>
            <p className="font-display text-2xl font-extrabold tabular-nums leading-none text-amber-950">
              ₹{s.priceFrom.toLocaleString("en-IN")}
              <span className="text-lg text-orange-600">+</span>
            </p>
          </div>
        </div>

        {pricedSubsOnly ? (
          <p className="mt-2 text-xs font-medium text-amber-900/80">
            Pick a priced option below—or add a variant from the menu.
          </p>
        ) : null}

        <div className="mt-2.5 flex flex-wrap gap-2">
          {pricedSubsOnly ? (
            <ServiceCardAddToCart
              service={s}
              size="sm"
              className={cartGradientClass}
            />
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
              className={cartGradientClass}
            />
          )}
          <Link href={bookHref} className={bookGradientClass}>
            See &amp; book
          </Link>
        </div>
      </div>
    </div>
  );
}
