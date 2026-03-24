"use client";

import Image from "next/image";
import { motion } from "framer-motion";

const testimonials = [
  {
    name: "Priya S.",
    place: "Bangalore",
    text: "Seamless scuba slot + video. Crew was calm, professional—felt like a premium operator.",
    img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=75",
    stars: 5,
  },
  {
    name: "Rahul M.",
    place: "Mumbai",
    text: "Combo with water sports saved us half a day of haggling on the beach.",
    img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=75",
    stars: 5,
  },
  {
    name: "Emily T.",
    place: "UK",
    text: "Clear WhatsApp updates, on-time pickup, and transparent pricing—rare in Goa.",
    img: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=75",
    stars: 5,
  },
];

export function TrustSection() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-ocean-500 sm:text-sm">
            Trust built on every tide
          </p>
          <h2 className="mt-1.5 font-display text-2xl font-bold text-ocean-900 sm:mt-2 sm:text-3xl lg:text-4xl">
            10,000+ Happy Customers
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-ocean-700 sm:mt-3 sm:text-base">
            Certified partners, audited gear cycles, and rescue-ready boats—ask us
            for operator credentials before you pay.
          </p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="rounded-2xl border border-ocean-100 bg-sand p-4 shadow-sm sm:p-6"
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="relative h-10 w-10 overflow-hidden rounded-full sm:h-12 sm:w-12">
                  <Image
                    src={t.img}
                    alt={t.name}
                    fill
                    className="object-cover"
                    sizes="48px"
                    loading="lazy"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ocean-900 sm:text-base">{t.name}</p>
                  <p className="text-[10px] text-ocean-600 sm:text-xs">Google review · {t.place}</p>
                </div>
              </div>
              <p className="mt-0.5 text-sm text-amber-500 sm:mt-1 sm:text-base">{"★".repeat(t.stars)}</p>
              <p className="mt-2 text-xs leading-snug text-ocean-800 sm:mt-3 sm:text-sm">{t.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
