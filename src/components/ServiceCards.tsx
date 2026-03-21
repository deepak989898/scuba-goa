"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { services } from "@/data/services";

export function ServiceCards() {
  return (
    <section className="bg-white py-16 sm:py-20" id="services">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-bold text-ocean-900 sm:text-4xl">
            Experiences curated for Goa
          </h2>
          <p className="mt-3 text-ocean-700">
            From scuba diving Goa to nightlife & adventure—pick a starting price,
            then fine-tune on WhatsApp.
          </p>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {services.map((s, idx) => (
            <motion.article
              key={s.slug}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: Math.min(idx * 0.04, 0.3) }}
              className="group relative overflow-hidden rounded-2xl border border-ocean-100 bg-sand shadow-sm transition hover:shadow-md"
            >
              <Link href={`/services/${s.slug}`} className="block">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={s.image}
                    alt={s.title}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-105"
                    sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 25vw"
                    loading="lazy"
                  />
                  {s.mostBooked && (
                    <span className="absolute left-3 top-3 rounded-full bg-ocean-600 px-2.5 py-0.5 text-xs font-semibold text-white shadow">
                      Most Booked
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-display text-lg font-semibold text-ocean-900">
                    {s.title}
                  </h3>
                  <p className="mt-1 text-sm text-ocean-600">{s.short}</p>
                  <p className="mt-3 text-sm font-semibold text-ocean-800">
                    From ₹{s.priceFrom.toLocaleString("en-IN")}+
                  </p>
                </div>
              </Link>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
