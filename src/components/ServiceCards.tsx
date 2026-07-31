"use client";

import Link from "next/link";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import { useServices } from "@/hooks/useServices";
import { ServiceCardAddToCart } from "@/components/cart/ServiceCardAddToCart";
import { ServiceMetaBlock } from "@/components/ServiceMetaBlock";

export function ServiceCards() {
  const { services, loading } = useServices();

  if (loading) {
    return (
      <section className="relative z-0 bg-white pt-2 pb-5 sm:pt-6 sm:pb-6" id="services">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-3 sm:mb-4">
            <h2 className="font-display text-xl font-bold text-ocean-900 sm:text-2xl">
              More ways to love Goa
            </h2>
            <p className="mt-0.5 text-xs text-ocean-700 sm:text-sm">
              Tours, waterfalls, water sports — add to cart or tap Details, then checkout when
              you&apos;re ready to commit.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-52 animate-pulse rounded-xl bg-ocean-50 sm:h-72"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative z-0 bg-white pt-2 pb-5 sm:pt-6 sm:pb-6" id="services">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-3 sm:mb-4">
          <h2 className="font-display text-xl font-bold text-ocean-900 sm:text-2xl">
            More ways to love Goa
          </h2>
          <p className="mt-0.5 text-xs text-ocean-700 sm:text-sm">
            Tours, waterfalls, water sports — add to cart or tap Details, then checkout when
            you&apos;re ready to commit.
          </p>
        </div>
        <div className="grid grid-cols-2 items-start gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {services.map((s) => (
            <article
              key={s.slug}
              className="u-depth-card group relative flex min-h-0 flex-col overflow-visible rounded-xl border border-ocean-100 bg-sand"
            >
              <Link
                href={`/services/${s.slug}`}
                className="absolute inset-0 z-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
                aria-label={`${s.title} — view details and booking`}
              >
                <span className="sr-only">{s.title}</span>
              </Link>
              <div className="pointer-events-none relative z-[1] flex min-h-0 flex-1 flex-col">
                {/* Intrinsic image — full graphic, no crop / no letterbox bars */}
                <div className="pointer-events-none relative shrink-0 overflow-hidden rounded-t-xl bg-ocean-950">
                  <CmsRemoteImage
                    src={s.image}
                    alt={s.title}
                    showFull
                    className="block w-full"
                    loading="lazy"
                  />
                  {s.mostBooked ? (
                    <span className="pointer-events-none absolute left-1.5 top-1.5 z-10 rounded-full bg-ocean-700 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow sm:left-2.5 sm:top-2.5 sm:px-2 sm:text-xs">
                      Most Booked
                    </span>
                  ) : null}
                  {s.limitedSlots ? (
                    <span className="pointer-events-none absolute right-1.5 top-1.5 z-10 rounded-full bg-red-600/90 px-1.5 py-0.5 text-[10px] font-semibold text-white sm:right-2.5 sm:top-2.5 sm:px-2 sm:text-xs">
                      Limited Slots
                    </span>
                  ) : null}
                </div>
                <div className="pointer-events-none flex min-h-0 flex-1 flex-col p-1.5 sm:p-3 [&_*]:pointer-events-none [&_a]:pointer-events-auto">
                  <h3 className="line-clamp-2 min-h-[2.5rem] font-display text-xs font-semibold leading-snug text-ocean-900 sm:min-h-[2.5rem] sm:text-base">
                    {s.title}
                  </h3>
                  <ServiceMetaBlock s={s} variant="cardGrid" />
                  <div className="mt-auto pt-1.5 sm:pt-2">
                    <div className="rounded-lg border-2 border-ocean-600 bg-gradient-to-br from-amber-50 via-white to-cyan-50 px-1.5 py-1 shadow-md ring-1 ring-ocean-200/80 sm:px-2.5 sm:py-2">
                      <p className="text-[8px] font-extrabold uppercase tracking-wider text-ocean-800 sm:text-[10px]">
                        From
                      </p>
                      <p className="font-display text-sm font-extrabold tabular-nums leading-tight text-ocean-950 sm:text-lg">
                        ₹{s.priceFrom.toLocaleString("en-IN")}
                        <span className="text-xs font-bold text-cyan-700 sm:text-sm">
                          +
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
                <div className="pointer-events-none relative z-[2] mt-auto flex w-full flex-nowrap items-stretch gap-1 px-1.5 pb-1.5 sm:gap-1.5 sm:px-3 sm:pb-3">
                  <span className="pointer-events-auto min-w-0 flex-1 [&_button]:w-full [&_button]:min-h-9 [&_button]:px-1 [&_button]:py-1.5 [&_button]:text-[10px] [&_button]:leading-tight sm:[&_button]:min-h-11 sm:[&_button]:px-4 sm:[&_button]:py-3 sm:[&_button]:text-sm">
                    <ServiceCardAddToCart
                      service={s}
                      size="sm"
                      className="block w-full"
                      compactMobileLabel
                    />
                  </span>
                  <Link
                    href={`/services/${s.slug}`}
                    className="pointer-events-auto inline-flex min-h-9 min-w-0 flex-1 touch-manipulation items-center justify-center rounded-full bg-cyan-500 px-1 py-1.5 text-center text-[10px] font-extrabold leading-tight text-slate-950 shadow-md shadow-cyan-900/35 transition hover:bg-cyan-400 active:bg-cyan-300 sm:min-h-11 sm:px-3.5 sm:py-2.5 sm:text-sm"
                  >
                    Details
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
