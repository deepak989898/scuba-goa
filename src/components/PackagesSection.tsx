"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { usePackages } from "@/hooks/usePackages";
import { AddToCartButton } from "@/components/cart/AddToCartButton";

export function PackagesSection() {
  const { packages, loading } = usePackages();

  return (
    <section className="bg-gradient-to-b from-ocean-50/80 to-white py-16 sm:py-20" id="packages">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-3xl font-bold text-ocean-900 sm:text-4xl">
              Live packages
            </h2>
            <p className="mt-2 text-ocean-700">
              Pulled from Firestore when configured—fallback demo rates always
              visible for SEO previews.
            </p>
          </div>
          <Link
            href="/booking"
            className="text-sm font-semibold text-ocean-600 hover:text-ocean-800"
          >
            View all booking options →
          </Link>
        </div>
        {loading ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((k) => (
              <div
                key={k}
                className="h-96 animate-pulse rounded-2xl bg-ocean-100/80"
              />
            ))}
          </div>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {packages.map((p, idx) => (
              <motion.article
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                className="flex flex-col overflow-hidden rounded-2xl border border-ocean-100 bg-white shadow-sm"
              >
                <div className="relative aspect-[16/10]">
                  <Image
                    src={
                      p.imageUrl ??
                      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=75"
                    }
                    alt={p.name}
                    fill
                    className="object-cover"
                    sizes="(max-width:1024px) 100vw, 33vw"
                    loading="lazy"
                  />
                  {p.isCombo && p.discountPct ? (
                    <span className="absolute right-3 top-3 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
                      {p.discountPct}% OFF
                    </span>
                  ) : null}
                  {p.limitedSlots ? (
                    <span className="absolute left-3 top-3 rounded-full bg-red-600/90 px-2 py-0.5 text-xs font-semibold text-white">
                      Limited Slots
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-ocean-500">
                    {p.category ?? "Goa"}
                  </p>
                  <h3 className="mt-1 font-display text-xl font-semibold text-ocean-900">
                    {p.name}
                  </h3>
                  <p className="mt-1 text-sm text-ocean-600">{p.duration}</p>
                  <p className="mt-2 text-sm font-medium text-amber-700">
                    ⭐ {p.rating.toFixed(1)} rated
                  </p>
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {p.includes.slice(0, 4).map((inc) => (
                      <li
                        key={inc}
                        className="rounded-full bg-ocean-50 px-2 py-0.5 text-xs text-ocean-800"
                      >
                        {inc}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-ocean-600">
                    {p.slotsLeft != null ? (
                      <span className="font-semibold text-red-600">
                        Only {p.slotsLeft} slots left
                      </span>
                    ) : null}
                    {p.bookedToday != null ? (
                      <span>Booked {p.bookedToday} times today</span>
                    ) : null}
                  </div>
                  <div className="mt-auto flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-2xl font-bold text-ocean-900">
                      ₹{p.price.toLocaleString("en-IN")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <AddToCartButton
                        variant="package"
                        id={p.id}
                        name={p.name}
                        price={p.price}
                        image={
                          p.imageUrl ??
                          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=75"
                        }
                        duration={p.duration}
                        size="sm"
                      />
                      <Link
                        href={`/booking?package=${encodeURIComponent(p.id)}`}
                        className="rounded-full bg-ocean-gradient px-4 py-2 text-sm font-semibold text-white shadow-md"
                      >
                        Book Now
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
