"use client";

import type { ServiceItem } from "@/data/services";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { getSubServiceCartKey } from "@/lib/service-sub-helpers";

type Props = { service: ServiceItem };

export function ServiceSubServicesCart({ service: s }: Props) {
  if (!s.subServices?.length) return null;

  return (
    <section className="mt-10 border-t border-ocean-100 pt-10">
      <h2 className="font-display text-xl font-bold text-ocean-900 sm:text-2xl">
        Options &amp; add-ons
      </h2>
      <p className="mt-2 text-sm text-ocean-600">
        Add a variant to your cart at its own price—you can mix with other services and
        checkout once from the cart.
      </p>
      <ul className="mt-6 space-y-4">
        {s.subServices.map((sub, idx) => {
          const key = getSubServiceCartKey(sub, idx);
          const priceOk =
            sub.priceFrom != null &&
            Number.isFinite(sub.priceFrom) &&
            sub.priceFrom > 0;
          const lineTitle = `${s.title} — ${sub.title}`;

          return (
            <li
              key={`${key}-${idx}`}
              className="rounded-2xl border border-ocean-100 bg-ocean-50/40 p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-display text-lg font-semibold text-ocean-900">
                  {sub.title}
                </h3>
                {priceOk ? (
                  <p className="text-sm font-bold text-ocean-800">
                    ₹{sub.priceFrom!.toLocaleString("en-IN")}
                  </p>
                ) : (
                  <p className="text-xs font-medium text-ocean-500">
                    Set a price in admin to enable Add to cart
                  </p>
                )}
              </div>
              {sub.description ? (
                <p className="mt-2 text-sm leading-relaxed text-ocean-700 whitespace-pre-line">
                  {sub.description}
                </p>
              ) : null}
              {sub.includes && sub.includes.length > 0 ? (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {sub.includes.map((inc, j) => (
                    <li
                      key={`${idx}-${j}-${inc}`}
                      className="rounded-full bg-white px-2.5 py-0.5 text-xs text-ocean-800 ring-1 ring-ocean-100"
                    >
                      {inc}
                    </li>
                  ))}
                </ul>
              ) : null}
              {priceOk ? (
                <div className="mt-4">
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
                    slotsLeft={s.slotsLeft}
                    bookedToday={s.bookedToday}
                    size="sm"
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
