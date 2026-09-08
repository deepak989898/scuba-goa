"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatHotelPriceInr } from "@/lib/goa-hotels/format";
import { pickHotelHeroImage } from "@/lib/goa-hotels/images";
import { getHotelDisplayPriceFrom } from "@/lib/goa-hotels/normalize-pricing";
import type { GoaHotelDoc } from "@/lib/goa-hotels/types";
import { getPublicCmsCatalogCached } from "@/hooks/usePublicCmsCatalog";

const HOME_HOTELS_COUNT = 4;

function HomeHotelCard({ hotel }: { hotel: GoaHotelDoc }) {
  const image = pickHotelHeroImage(hotel);
  const priceFrom = getHotelDisplayPriceFrom(hotel);
  const href = `/hotels/${encodeURIComponent(hotel.slug)}`;

  return (
    <article
      className="u-depth-card group relative flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-ocean-100 bg-sand"
    >
      <Link
        href={href}
        className="absolute inset-0 z-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
        aria-label={`${hotel.name} — view hotel and book`}
      >
        <span className="sr-only">{hotel.name}</span>
      </Link>
      <div className="pointer-events-none relative z-[1] flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 overflow-hidden rounded-t-xl">
          <div className="relative aspect-[3/2] overflow-hidden bg-ocean-50">
            {image ? (
              <img
                src={image}
                alt={hotel.name}
                className="absolute inset-0 h-full w-full object-cover object-center transition duration-500 group-hover:scale-105"
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : null}
            {hotel.starRating ? (
              <span className="absolute left-2 top-2 rounded-full bg-slate-900/75 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                {hotel.starRating}★
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col px-2 pb-0 pt-1.5 sm:px-2.5 sm:pt-2">
          <h3 className="line-clamp-2 bg-gradient-to-r from-cyan-600 via-ocean-700 to-teal-600 bg-clip-text font-display text-[13px] font-extrabold leading-snug text-transparent sm:text-base">
            {hotel.name}
          </h3>
          <p className="mt-0.5 line-clamp-1 text-[11px] text-ocean-600 sm:text-xs">
            {hotel.locality || hotel.location || "Goa"}
          </p>
          <div className="mt-1.5">
            <div className="rounded-md border-2 border-ocean-600 bg-gradient-to-br from-amber-50 via-white to-cyan-50 px-1.5 py-0.5 shadow-sm ring-1 ring-ocean-200/80 sm:px-2 sm:py-1">
              <p className="text-[9px] font-extrabold uppercase tracking-wider text-ocean-800 sm:text-[10px]">
                From
              </p>
              <p className="font-display text-[15px] font-extrabold tabular-nums leading-tight text-ocean-950 sm:text-lg">
                {priceFrom > 0 ? (
                  <>
                    {formatHotelPriceInr(priceFrom)}
                    <span className="text-[11px] font-semibold text-ocean-700 sm:text-xs">
                      {" "}
                      / night
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-ocean-600">Rates updating</span>
                )}
              </p>
            </div>
          </div>
        </div>
        <div className="relative z-[2] mt-1.5 px-2 pb-2 sm:mt-2 sm:px-2.5 sm:pb-2.5">
          <Link
            href={href}
            className="pointer-events-auto inline-flex min-h-9 w-full touch-manipulation items-center justify-center rounded-full bg-cyan-500 px-3 py-1.5 text-center text-[11px] font-extrabold leading-tight text-slate-950 shadow-md shadow-cyan-900/35 transition hover:bg-cyan-400 active:bg-cyan-300 sm:min-h-10 sm:text-sm"
          >
            View rooms
          </Link>
        </div>
      </div>
    </article>
  );
}

export function HomeHotelCards() {
  const [hotels, setHotels] = useState<GoaHotelDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const catalog = await getPublicCmsCatalogCached();
        if (!cancelled) {
          setHotels((catalog.hotelsPreview ?? []).slice(0, HOME_HOTELS_COUNT));
        }
      } catch {
        if (!cancelled) setHotels([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <section className="relative z-0 bg-white pb-5 sm:pb-6" id="hotels">
        <div className="site-container">
          <div className="mb-3 sm:mb-4">
            <h2 className="font-display text-xl font-bold text-ocean-900 sm:text-2xl">
              Goa hotels &amp; stays
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-52 animate-pulse rounded-xl bg-ocean-50 sm:h-64" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (hotels.length === 0) return null;

  return (
    <section className="relative z-0 bg-white pb-5 sm:pb-6" id="hotels">
      <div className="site-container">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2 sm:mb-4">
          <div>
            <h2 className="font-display text-xl font-bold text-ocean-900 sm:text-2xl">
              Goa hotels &amp; stays
            </h2>
            <p className="mt-0.5 text-xs text-ocean-700 sm:text-sm">
              Curated stays with photos and Razorpay checkout — pick dates on the hotel page.
            </p>
          </div>
          <Link
            href="/hotels"
            className="shrink-0 text-sm font-bold text-cyan-700 hover:text-cyan-800"
          >
            View all hotels →
          </Link>
        </div>
        <div className="grid grid-cols-2 items-stretch gap-3 sm:gap-4 xl:grid-cols-4">
          {hotels.map((hotel) => (
            <HomeHotelCard key={hotel.id} hotel={hotel} />
          ))}
        </div>
      </div>
    </section>
  );
}
