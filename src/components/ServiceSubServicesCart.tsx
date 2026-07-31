"use client";

import Link from "next/link";
import type { ServiceItem } from "@/data/services";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { encodeServiceSubOption } from "@/lib/booking-selection";
import { buildHeroBookingHref } from "@/lib/hero-slide-booking";
import {
  assignSubServicePublicSlugs,
  getSubServiceCartKey,
  getSubServicePublicPath,
} from "@/lib/service-sub-helpers";

type Props = { service: ServiceItem };

const priceBadgeClass =
  "inline-flex min-h-10 w-full cursor-default items-center justify-center rounded-full border-2 border-amber-500/80 bg-gradient-to-r from-yellow-200 via-amber-100 to-orange-100 px-3 py-2 text-center font-display text-sm font-extrabold tabular-nums text-amber-950 shadow-sm";

const viewDetailsClass =
  "inline-flex min-h-10 w-full touch-manipulation items-center justify-center rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-500 px-3 py-2 text-center text-sm font-extrabold text-white shadow-md shadow-cyan-700/30 ring-1 ring-cyan-200/60 transition hover:brightness-110 active:brightness-95";

const addToCartClass =
  "!min-h-10 !w-full !border-0 !bg-gradient-to-r !from-teal-500 !via-cyan-600 !to-ocean-800 !px-3 !py-2 !text-sm !font-extrabold !text-white !shadow-md !shadow-cyan-700/35 ring-1 ring-cyan-300/50 hover:!brightness-110";

const bookNowClass =
  "inline-flex min-h-10 w-full touch-manipulation items-center justify-center rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-3 py-2 text-center text-sm font-extrabold text-white shadow-md shadow-orange-500/35 ring-1 ring-amber-200/70 transition hover:brightness-110 active:brightness-95";

export function ServiceSubServicesCart({ service: s }: Props) {
  if (!s.subServices?.length) return null;

  const pathByIndex = new Map(
    assignSubServicePublicSlugs([s]).map((e) => [e.index, e.path] as const),
  );

  return (
    <section className="mt-5 border-t border-ocean-100 pt-4">
      <h2 className="mb-2.5 font-display text-lg font-bold text-ocean-900">
        Packages &amp; options
      </h2>
      <ul className="space-y-3">
        {s.subServices.map((sub, idx) => {
          const key = getSubServiceCartKey(sub, idx);
          const href =
            pathByIndex.get(idx) ?? getSubServicePublicPath(sub, idx);
          const priceOk =
            sub.priceFrom != null &&
            Number.isFinite(sub.priceFrom) &&
            sub.priceFrom > 0;
          const lineTitle = `${s.title} — ${sub.title}`;
          const bookHref = buildHeroBookingHref(
            encodeServiceSubOption(s.slug, key),
          );

          return (
            <li
              key={`${key}-${idx}`}
              className="relative overflow-hidden rounded-2xl border-2 border-amber-300/90 bg-gradient-to-br from-amber-200 via-yellow-100 to-orange-100 p-3 shadow-lg shadow-amber-400/25 ring-2 ring-amber-200/70 sm:p-3.5"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br from-yellow-300/60 to-orange-300/35 blur-2xl"
              />
              <div className="relative flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-base font-semibold text-amber-950 sm:text-lg">
                    <Link
                      href={href}
                      className="hover:text-orange-800 hover:underline"
                    >
                      {sub.title}
                    </Link>
                  </h3>
                  {sub.description ? (
                    <p className="mt-1.5 text-sm leading-snug text-amber-950/80 whitespace-pre-line">
                      {sub.description}
                    </p>
                  ) : null}
                  {sub.includes && sub.includes.length > 0 ? (
                    <ul className="mt-2 flex flex-wrap gap-1">
                      {sub.includes.map((inc, j) => (
                        <li
                          key={`${idx}-${j}-${inc}`}
                          className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-medium text-amber-950 ring-1 ring-amber-300/70"
                        >
                          {inc}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {sub.slotsLeft != null || sub.bookedToday != null ? (
                    <div className="mt-1.5 flex flex-wrap gap-2 text-xs text-amber-950/80">
                      {sub.slotsLeft != null ? (
                        <span className="font-semibold text-red-600">
                          Only {sub.slotsLeft} slots left
                        </span>
                      ) : null}
                      {sub.bookedToday != null ? (
                        <span>Booked {sub.bookedToday} times today</span>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="flex w-full shrink-0 flex-col gap-2 sm:w-40 sm:self-center">
                  <div
                    className={priceBadgeClass}
                    aria-label={
                      priceOk
                        ? `Price ₹${sub.priceFrom!.toLocaleString("en-IN")}`
                        : "Price not set"
                    }
                  >
                    {priceOk
                      ? `₹${sub.priceFrom!.toLocaleString("en-IN")}`
                      : "Price TBA"}
                  </div>
                  <Link href={href} className={viewDetailsClass}>
                    View details
                  </Link>
                  {priceOk ? (
                    <AddToCartButton
                      variant="service"
                      slug={s.slug}
                      title={lineTitle}
                      priceFrom={sub.priceFrom!}
                      subKey={key}
                      image={s.image}
                      duration={s.duration}
                      includes={sub.includes ?? s.includes}
                      rating={s.rating}
                      slotsLeft={sub.slotsLeft ?? s.slotsLeft}
                      bookedToday={sub.bookedToday ?? s.bookedToday}
                      size="sm"
                      className={addToCartClass}
                    />
                  ) : (
                    <span
                      className="inline-flex min-h-10 w-full cursor-not-allowed items-center justify-center rounded-full bg-slate-300/80 px-3 py-2 text-center text-sm font-extrabold text-slate-600"
                      title="Set a price in admin to enable Add to cart"
                    >
                      Add to cart
                    </span>
                  )}
                  <Link
                    href={priceOk ? bookHref : href}
                    className={bookNowClass}
                  >
                    Book now
                  </Link>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
