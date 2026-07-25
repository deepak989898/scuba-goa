"use client";

import Link from "next/link";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import { ServiceCardImageSlider } from "@/components/ServiceCardImageSlider";
import { useServices } from "@/hooks/useServices";
import { ServiceCardAddToCart } from "@/components/cart/ServiceCardAddToCart";
import { ServiceMetaBlock } from "@/components/ServiceMetaBlock";
import { serviceDetailImages } from "@/lib/service-images";

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
        <div className="grid grid-cols-2 items-stretch gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {services.map((s) => {
            const cardImgs = serviceDetailImages(s);
            const multi = cardImgs.filter(Boolean).length > 1;
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
                <div className="relative z-[1] flex min-h-0 flex-1 flex-col pointer-events-none">
                  <div className="pointer-events-none shrink-0 overflow-hidden rounded-t-xl">
                    {multi ? (
                      <ServiceCardImageSlider
                        images={cardImgs}
                        alt={s.title}
                        mostBooked={s.mostBooked}
                        limitedSlots={s.limitedSlots}
                        sizes={imgSizes}
                        aspectClass="aspect-[16/10] sm:aspect-[5/4]"
                        passthroughClicks
                        showDots={false}
                      />
                    ) : (
                      <div className="relative aspect-[16/10] overflow-hidden sm:aspect-[5/4] pointer-events-none [&_*]:pointer-events-none">
                        <CmsRemoteImage
                          src={s.image}
                          alt={s.title}
                          fill
                          className="object-cover transition duration-500 group-hover:scale-105"
                          sizes={imgSizes}
                          loading="lazy"
                        />
                        {s.mostBooked ? (
                          <span className="pointer-events-none absolute left-1.5 top-1.5 rounded-full bg-ocean-700 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow sm:left-2.5 sm:top-2.5 sm:px-2 sm:text-xs">
                            Most Booked
                          </span>
                        ) : null}
                        {s.limitedSlots ? (
                          <span className="pointer-events-none absolute right-1.5 top-1.5 rounded-full bg-red-600/90 px-1.5 py-0.5 text-[10px] font-semibold text-white sm:right-2.5 sm:top-2.5 sm:px-2 sm:text-xs">
                            Limited Slots
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>
                  <div className="pointer-events-none flex min-h-0 flex-1 flex-col p-2 sm:p-3 [&_*]:pointer-events-none [&_a]:pointer-events-auto">
                    <h3 className="line-clamp-2 min-h-[2.25rem] font-display text-sm font-semibold leading-snug text-ocean-900 sm:min-h-[2.5rem] sm:text-base">
                      {s.title}
                    </h3>
                    <ServiceMetaBlock s={s} variant="cardGrid" />
                    <div className="mt-1.5 rounded-lg border-2 border-ocean-600 bg-gradient-to-br from-amber-50 via-white to-cyan-50 px-2 py-1.5 shadow-md ring-1 ring-ocean-200/80 sm:mt-2 sm:px-2.5 sm:py-2">
                      <p className="text-[9px] font-extrabold uppercase tracking-wider text-ocean-800 sm:text-[10px]">
                        From
                      </p>
                      <p className="font-display text-base font-extrabold tabular-nums leading-tight text-ocean-950 sm:text-lg">
                        ₹{s.priceFrom.toLocaleString("en-IN")}
                        <span className="text-sm font-bold text-cyan-700">+</span>
                      </p>
                    </div>
                  </div>
                  <div className="relative z-[2] mt-auto flex flex-wrap gap-1 px-2 pb-2 pointer-events-none sm:gap-1.5 sm:px-3 sm:pb-3">
                    <span className="pointer-events-auto inline-flex">
                      <ServiceCardAddToCart service={s} size="sm" />
                    </span>
                    <Link
                      href={`/services/${s.slug}`}
                      className="pointer-events-auto inline-flex min-h-10 min-w-0 touch-manipulation items-center justify-center rounded-full bg-cyan-500 px-3.5 py-2.5 text-center text-sm font-extrabold text-slate-950 shadow-md shadow-cyan-900/35 transition hover:bg-cyan-400 active:bg-cyan-300"
                    >
                      See &amp; book
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
