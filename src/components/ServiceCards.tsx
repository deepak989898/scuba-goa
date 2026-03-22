"use client";

import Link from "next/link";
import { motion } from "framer-motion";
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
      <section className="bg-white py-16 sm:py-20" id="services">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="h-10 max-w-md animate-pulse rounded-lg bg-ocean-100" />
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-96 animate-pulse rounded-2xl bg-ocean-50"
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
          <h2 className="font-display text-3xl font-bold text-ocean-900 sm:text-4xl">
            Experiences curated for Goa
          </h2>
          <p className="mt-3 text-ocean-700">
            Add any experience to your cart, then checkout once with Razorpay—or chat
            on WhatsApp anytime.
          </p>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {services.map((s, idx) => {
            const cardImgs = serviceDetailImages(s);
            const multi = cardImgs.filter(Boolean).length > 1;
            const imgSizes =
              "(max-width:640px) 100vw, (max-width:1024px) 50vw, 25vw";

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
                    />
                  ) : (
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <CmsRemoteImage
                        src={s.image}
                        alt={s.title}
                        fill
                        className="object-cover transition duration-500 group-hover:scale-105"
                        sizes={imgSizes}
                        loading="lazy"
                      />
                      {s.mostBooked ? (
                        <span className="absolute left-3 top-3 rounded-full bg-ocean-600 px-2.5 py-0.5 text-xs font-semibold text-white shadow">
                          Most Booked
                        </span>
                      ) : null}
                      {s.limitedSlots ? (
                        <span className="absolute right-3 top-3 rounded-full bg-red-600/90 px-2 py-0.5 text-xs font-semibold text-white">
                          Limited Slots
                        </span>
                      ) : null}
                    </div>
                  )}
                </Link>
                <div className="flex flex-1 flex-col p-4">
                  <Link href={`/services/${s.slug}`}>
                    <h3 className="font-display text-lg font-semibold text-ocean-900 hover:text-ocean-600">
                      {s.title}
                    </h3>
                  </Link>
                  <p className="mt-1 text-sm text-ocean-600">{s.short}</p>
                  <ServiceMetaBlock s={s} />
                  <p className="mt-3 text-lg font-bold text-ocean-900">
                    From ₹{s.priceFrom.toLocaleString("en-IN")}+
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <ServiceCardAddToCart service={s} size="sm" />
                    <Link
                      href={`/services/${s.slug}`}
                      className="min-h-11 min-w-11 rounded-full border border-ocean-200 px-3 py-2 text-xs font-semibold text-ocean-700 hover:bg-ocean-50 active:bg-ocean-100"
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
