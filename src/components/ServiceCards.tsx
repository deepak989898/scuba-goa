"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import { ServiceCardImageSlider } from "@/components/ServiceCardImageSlider";
import { useServices } from "@/hooks/useServices";
import { ServiceCardAddToCart } from "@/components/cart/ServiceCardAddToCart";
import { ServiceMetaBlock } from "@/components/ServiceMetaBlock";
import { ServiceShortClamp } from "@/components/ServiceShortClamp";
import { serviceDetailImages } from "@/lib/service-images";

export function ServiceCards() {
  const { services, loading } = useServices();

  if (loading) {
    return (
      <section className="bg-white py-16 sm:py-20" id="services">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="h-10 max-w-md animate-pulse rounded-lg bg-ocean-100" />
          <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-2xl bg-ocean-50 sm:h-96"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white py-16 sm:py-20" id="services">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl font-bold text-ocean-900 sm:text-3xl lg:text-4xl">
            Experiences curated for Goa
          </h2>
          <p className="mt-2 text-sm text-ocean-700 sm:mt-3 sm:text-base">
            Add any experience to your cart, then checkout once with Razorpay—or chat
            on WhatsApp anytime.
          </p>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
          {services.map((s, idx) => {
            const cardImgs = serviceDetailImages(s);
            const multi = cardImgs.filter(Boolean).length > 1;
            const imgSizes =
              "(max-width:640px) 50vw, (max-width:1024px) 50vw, 25vw";

            return (
              <motion.article
                key={s.slug}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(idx * 0.04, 0.3) }}
                className="group flex flex-col overflow-visible rounded-2xl border border-ocean-100 bg-sand shadow-sm transition hover:shadow-md"
              >
                <Link
                  href={`/services/${s.slug}`}
                  className="block shrink-0 overflow-hidden rounded-t-2xl"
                >
                  {multi ? (
                    <ServiceCardImageSlider
                      images={cardImgs}
                      alt={s.title}
                      mostBooked={s.mostBooked}
                      limitedSlots={s.limitedSlots}
                      sizes={imgSizes}
                      aspectClass="aspect-[2/1] sm:aspect-[4/3]"
                    />
                  ) : (
                    <div className="relative aspect-[2/1] overflow-hidden sm:aspect-[4/3]">
                      <CmsRemoteImage
                        src={s.image}
                        alt={s.title}
                        fill
                        className="object-cover transition duration-500 group-hover:scale-105"
                        sizes={imgSizes}
                        loading="lazy"
                      />
                      {s.mostBooked ? (
                        <span className="absolute left-1.5 top-1.5 rounded-full bg-ocean-600 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow sm:left-3 sm:top-3 sm:px-2.5 sm:text-xs">
                          Most Booked
                        </span>
                      ) : null}
                      {s.limitedSlots ? (
                        <span className="absolute right-1.5 top-1.5 rounded-full bg-red-600/90 px-1.5 py-0.5 text-[10px] font-semibold text-white sm:right-3 sm:top-3 sm:px-2 sm:text-xs">
                          Limited Slots
                        </span>
                      ) : null}
                    </div>
                  )}
                </Link>
                <div className="flex flex-1 flex-col p-2.5 sm:p-4">
                  <Link href={`/services/${s.slug}`}>
                    <h3 className="font-display text-sm font-semibold leading-snug text-ocean-900 hover:text-ocean-600 sm:text-lg">
                      {s.title}
                    </h3>
                  </Link>
                  <ServiceShortClamp slug={s.slug} text={s.short} />
                  <ServiceMetaBlock s={s} />
                  <p className="mt-1.5 text-sm font-bold text-ocean-900 sm:mt-3 sm:text-lg">
                    From ₹{s.priceFrom.toLocaleString("en-IN")}+
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1 sm:mt-4 sm:gap-2">
                    <ServiceCardAddToCart service={s} size="sm" />
                    <Link
                      href={`/services/${s.slug}`}
                      className="min-h-8 min-w-8 rounded-full border border-ocean-200 px-2 py-1 text-[10px] font-semibold text-ocean-700 hover:bg-ocean-50 active:bg-ocean-100 sm:min-h-11 sm:min-w-11 sm:px-3 sm:py-2 sm:text-xs"
                    >
                      Details
                    </Link>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
