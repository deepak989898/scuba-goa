"use client";

import Link from "next/link";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import { useServices } from "@/hooks/useServices";
import { ServiceCardAddToCart } from "@/components/cart/ServiceCardAddToCart";
import { ServiceMetaBlock } from "@/components/ServiceMetaBlock";
import { serviceDetailImages } from "@/lib/service-images";

export function ServiceCards() {
  const { services, loading } = useServices();

  if (loading) {
    return (
      <section className="relative z-0 bg-white pt-2 pb-5 sm:pt-6 sm:pb-6" id="services">
        <div className="site-container">
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
      <div className="site-container">
        <div className="mb-3 sm:mb-4">
          <h2 className="font-display text-xl font-bold text-ocean-900 sm:text-2xl">
            More ways to love Goa
          </h2>
          <p className="mt-0.5 text-xs text-ocean-700 sm:text-sm">
            Tours, waterfalls, water sports — add to cart or tap Details, then checkout when
            you&apos;re ready to commit.
          </p>
        </div>
        <div className="grid grid-cols-2 items-stretch gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {services.map((s) => {
            const cardImgs = serviceDetailImages(s);
            const firstImg =
              cardImgs.map((u) => u.trim()).find(Boolean) || s.image;
            const imgSizes =
              "(max-width:640px) 50vw, (max-width:1024px) 50vw, 25vw";

            return (
              <article
                key={s.slug}
                className="u-depth-card group relative flex h-full min-h-0 flex-col overflow-visible rounded-xl border border-ocean-100 bg-sand"
              >
                <Link
                  href={`/services/${s.slug}`}
                  className="absolute inset-0 z-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
                  aria-label={`${s.title} — view details and booking`}
                >
                  <span className="sr-only">{s.title}</span>
                </Link>
                <div className="pointer-events-none relative z-[1] flex min-h-0 flex-1 flex-col">
                  {/* 1536×1024 (3:2) — mobile: +5px height vs pure 3:2 in 2-col grid */}
                  <div className="pointer-events-none shrink-0 overflow-hidden rounded-t-xl">
                    <div className="relative aspect-[3/2] overflow-hidden">
                      <CmsRemoteImage
                        src={firstImg}
                        alt={s.title}
                        fill
                        className="object-cover object-center transition duration-500 group-hover:scale-105"
                        sizes={imgSizes}
                        loading="lazy"
                      />
                      {s.mostBooked ? (
                        <span className="pointer-events-none absolute left-1.5 top-1.5 rounded-full bg-ocean-700 px-1.5 py-0.5 text-[11px] font-semibold text-white shadow sm:left-2.5 sm:top-2.5 sm:px-2 sm:text-xs">
                          Most Booked
                        </span>
                      ) : null}
                      {s.limitedSlots ? (
                        <span className="pointer-events-none absolute right-1.5 top-1.5 rounded-full bg-red-600/90 px-1.5 py-0.5 text-[11px] font-semibold text-white sm:right-2.5 sm:top-2.5 sm:px-2 sm:text-xs">
                          Limited Slots
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="pointer-events-none flex min-h-0 flex-1 flex-col px-1.5 pb-0 pt-1 sm:px-2.5 sm:pt-1.5 [&_*]:pointer-events-none [&_a]:pointer-events-auto">
                    <h3 className="line-clamp-2 bg-gradient-to-r from-cyan-600 via-ocean-700 to-teal-600 bg-clip-text font-display text-[13px] font-extrabold leading-snug text-transparent sm:text-base">
                      {s.title}
                    </h3>
                    <ServiceMetaBlock s={s} variant="cardGrid" homeMobile />
                    <div className="mt-1.5">
                      <div className="rounded-md border-2 border-ocean-600 bg-gradient-to-br from-amber-50 via-white to-cyan-50 px-1.5 py-0.5 shadow-sm ring-1 ring-ocean-200/80 sm:px-2 sm:py-1">
                        <p className="text-[9px] font-extrabold uppercase tracking-wider text-ocean-800 sm:text-[10px]">
                          From
                        </p>
                        <p className="font-display text-[15px] font-extrabold tabular-nums leading-tight text-ocean-950 sm:text-lg">
                          ₹{s.priceFrom.toLocaleString("en-IN")}
                          <span className="text-[13px] font-bold text-cyan-700 sm:text-sm">
                            +
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="relative z-[2] mt-1.5 flex w-full flex-nowrap items-stretch gap-1 px-1.5 pb-1.5 pointer-events-none sm:mt-2 sm:gap-1.5 sm:px-2.5 sm:pb-2">
                    <span className="pointer-events-auto min-w-0 flex-1 [&_button]:w-full [&_button]:min-h-9 [&_button]:px-1 [&_button]:py-1.5 [&_button]:text-[11px] [&_button]:leading-tight sm:[&_button]:min-h-10 sm:[&_button]:px-3 sm:[&_button]:py-2 sm:[&_button]:text-sm">
                      <ServiceCardAddToCart
                        service={s}
                        size="sm"
                        className="block w-full"
                        compactMobileLabel
                      />
                    </span>
                    <Link
                      href={`/services/${s.slug}`}
                      className="pointer-events-auto inline-flex min-h-9 min-w-0 flex-1 touch-manipulation items-center justify-center rounded-full bg-cyan-500 px-1 py-1.5 text-center text-[11px] font-extrabold leading-tight text-slate-950 shadow-md shadow-cyan-900/35 transition hover:bg-cyan-400 active:bg-cyan-300 sm:min-h-10 sm:px-3 sm:py-2 sm:text-sm"
                    >
                      Details
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
