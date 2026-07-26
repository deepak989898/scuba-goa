"use client";

import Link from "next/link";
import type { ServiceItem } from "@/data/services";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import {
  assignSubServicePublicSlugs,
  getSubServiceCartKey,
  getSubServicePublicPath,
} from "@/lib/service-sub-helpers";

type Props = { service: ServiceItem };

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
      <ul className="space-y-2.5">
        {s.subServices.map((sub, idx) => {
          const key = getSubServiceCartKey(sub, idx);
          const href =
            pathByIndex.get(idx) ?? getSubServicePublicPath(sub, idx);
          const priceOk =
            sub.priceFrom != null &&
            Number.isFinite(sub.priceFrom) &&
            sub.priceFrom > 0;
          const lineTitle = `${s.title} — ${sub.title}`;

          return (
            <li
              key={`${key}-${idx}`}
              className="rounded-xl border border-ocean-100 bg-ocean-50/40 p-3 shadow-sm sm:p-3.5"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-display text-base font-semibold text-ocean-900 sm:text-lg">
                  <Link
                    href={href}
                    className="hover:text-cyan-800 hover:underline"
                  >
                    {sub.title}
                  </Link>
                </h3>
                {priceOk ? (
                  <p className="rounded-lg border-2 border-ocean-600 bg-gradient-to-br from-amber-50 via-white to-cyan-50 px-2.5 py-1 font-display text-base font-extrabold tabular-nums text-ocean-950 shadow-sm ring-1 ring-ocean-200/80">
                    ₹{sub.priceFrom!.toLocaleString("en-IN")}
                  </p>
                ) : (
                  <p className="text-xs font-medium text-ocean-500">
                    Set a price in admin to enable Add to cart
                  </p>
                )}
              </div>
              {sub.description ? (
                <p className="mt-1.5 text-sm leading-snug text-ocean-700 whitespace-pre-line">
                  {sub.description}
                </p>
              ) : null}
              {sub.includes && sub.includes.length > 0 ? (
                <ul className="mt-2 flex flex-wrap gap-1">
                  {sub.includes.map((inc, j) => (
                    <li
                      key={`${idx}-${j}-${inc}`}
                      className="rounded-full bg-white px-2 py-0.5 text-[11px] text-ocean-800 ring-1 ring-ocean-100"
                    >
                      {inc}
                    </li>
                  ))}
                </ul>
              ) : null}
              {sub.slotsLeft != null || sub.bookedToday != null ? (
                <div className="mt-1.5 flex flex-wrap gap-2 text-xs text-ocean-700">
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
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <Link
                  href={href}
                  className="inline-flex min-h-10 items-center justify-center rounded-full border border-ocean-300 bg-white px-3.5 py-2 text-sm font-bold text-ocean-900 transition hover:bg-ocean-50"
                >
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
                  />
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
