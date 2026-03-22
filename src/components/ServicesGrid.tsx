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
      <ul className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <li key={i} className="h-80 animate-pulse rounded-2xl bg-ocean-50" />
        ))}
      </ul>
    );
  }

  return (
    <ul className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {services.map((s) => {
        const cardImgs = serviceDetailImages(s);
        const multi = cardImgs.filter(Boolean).length > 1;
        const gridSizes = "(max-width:1024px) 100vw, 33vw";

        return (
        <li
          key={s.slug}
          className="overflow-visible rounded-2xl border border-ocean-100 bg-sand shadow-sm"
        >
          <Link
            href={`/services/${s.slug}`}
            className="group block overflow-hidden rounded-t-2xl"
          >
            {multi ? (
              <ServiceCardImageSlider
                images={cardImgs}
                alt={s.title}
                limitedSlots={s.limitedSlots}
                sizes={gridSizes}
                aspectClass="aspect-[16/10]"
              />
            ) : (
              <div className="relative aspect-[16/10] overflow-hidden">
                <CmsRemoteImage
                  src={s.image}
                  alt={s.title}
                  fill
                  className="object-cover transition group-hover:scale-105"
                  sizes={gridSizes}
                  loading="lazy"
                />
                {s.limitedSlots ? (
                  <span className="absolute right-3 top-3 rounded-full bg-red-600/90 px-2 py-0.5 text-xs font-semibold text-white">
                    Limited Slots
                  </span>
                ) : null}
              </div>
            )}
          </Link>
          <div className="p-5">
            <Link href={`/services/${s.slug}`}>
              <h2 className="font-display text-xl font-semibold text-ocean-900 hover:text-ocean-600">
                {s.title}
              </h2>
            </Link>
            <ServiceShortClamp slug={s.slug} text={s.short} />
            <ServiceMetaBlock s={s} />
            <p className="mt-3 text-lg font-bold text-ocean-900">
              From ₹{s.priceFrom.toLocaleString("en-IN")}+
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <ServiceCardAddToCart service={s} size="sm" />
              <Link
                href={`/services/${s.slug}`}
                className="inline-flex min-h-11 items-center rounded-full border border-ocean-200 px-3 py-2 text-xs font-semibold text-ocean-700 hover:bg-ocean-50 active:bg-ocean-100"
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
