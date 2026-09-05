"use client";

import Link from "next/link";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import { ServiceCardImageSlider } from "@/components/ServiceCardImageSlider";
import { useServices } from "@/hooks/useServices";
import { ServiceCardAddToCart } from "@/components/cart/ServiceCardAddToCart";
import { ServiceMetaBlock } from "@/components/ServiceMetaBlock";
import { ServiceShortClamp } from "@/components/ServiceShortClamp";
import { serviceDetailImages } from "@/lib/service-images";

export function ServicesGrid() {
  const { services, loading } = useServices();

  if (loading) {
    return (
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
        {[1, 2, 3].map((i) => (
          <li key={i} className="h-64 animate-pulse rounded-xl bg-ocean-50 sm:h-72" />
        ))}
      </ul>
    );
  }

  return (
    <ul className="mt-4 grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
      {services.map((s) => {
        const cardImgs = serviceDetailImages(s);
        const multi = cardImgs.filter(Boolean).length > 1;
        const gridSizes = "(max-width:1024px) 100vw, 33vw";

        return (
          <li
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
            {/* pointer-events-none so clicks reach the full-card Link; re-enable only on cart / details / slider arrows */}
            <div className="pointer-events-none relative z-[1] flex min-h-0 flex-1 flex-col">
              <div className="overflow-hidden rounded-t-xl">
                {multi ? (
                  <ServiceCardImageSlider
                    images={cardImgs}
                    alt={s.title}
                    limitedSlots={s.limitedSlots}
                    sizes={gridSizes}
                    aspectClass="aspect-[16/10]"
                    passthroughClicks
                  />
                ) : (
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <CmsRemoteImage
                      src={
                        s.image?.trim() ||
                        "/booking-header.webp"
                      }
                      alt={s.title}
                      fill
                      className="object-cover transition group-hover:scale-105"
                      sizes={gridSizes}
                      loading="lazy"
                    />
                    {s.limitedSlots ? (
                      <span className="absolute right-2.5 top-2.5 rounded-full bg-red-600/90 px-2 py-0.5 text-xs font-semibold text-white">
                        Limited Slots
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
              <div className="flex min-h-0 flex-1 flex-col p-3 sm:p-3.5 [&_a]:pointer-events-auto">
                <h2 className="line-clamp-2 min-h-[2.5rem] bg-gradient-to-r from-cyan-600 via-ocean-700 to-teal-600 bg-clip-text font-display text-lg font-extrabold leading-snug text-transparent sm:text-xl">
                  {s.title}
                </h2>
                <ServiceShortClamp slug={s.slug} text={s.short} />
                <ServiceMetaBlock s={s} variant="cardGrid" />
                <div className="mt-2 rounded-lg border-2 border-ocean-600 bg-gradient-to-br from-amber-50 via-white to-cyan-50 px-2.5 py-2 shadow-md ring-1 ring-ocean-200/80">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-ocean-800">
                    Starting at
                  </p>
                  <p className="font-display text-lg font-extrabold tabular-nums text-ocean-950 sm:text-xl">
                    ₹{s.priceFrom.toLocaleString("en-IN")}
                    <span className="text-base font-bold text-cyan-700">+</span>
                  </p>
                </div>
              </div>
              <div className="relative z-[2] mt-auto flex flex-wrap gap-1.5 px-3 pb-3 sm:px-3.5 sm:pb-3.5">
                <span className="pointer-events-auto">
                  <ServiceCardAddToCart service={s} size="sm" />
                </span>
                <Link
                  href={`/services/${s.slug}`}
                  className="pointer-events-auto inline-flex min-h-10 touch-manipulation items-center justify-center rounded-full bg-cyan-500 px-4 py-2.5 text-sm font-extrabold text-slate-950 shadow-md shadow-cyan-900/35 transition hover:bg-cyan-400 active:bg-cyan-300"
                >
                  View details
                </Link>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
