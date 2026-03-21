"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { usePackages } from "@/hooks/usePackages";
import { AddToCartButton } from "@/components/cart/AddToCartButton";

export function ComboOffers() {
  const { packages } = usePackages();
  const combos = packages.filter((p) => p.isCombo);

  if (!combos.length) return null;

  return (
    <section className="bg-ocean-900 py-16 text-white sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="font-display text-3xl font-bold sm:text-4xl">
          Combo offers
        </h2>
        <p className="mt-2 max-w-xl text-ocean-100">
          Stack scuba + water sports or tours—discounts auto-applied at checkout
          when you pick a combo package.
        </p>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {combos.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-display text-xl font-semibold">{c.name}</h3>
                  <p className="mt-1 text-sm text-ocean-100">{c.duration}</p>
                </div>
                {c.discountPct ? (
                  <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-ocean-900">
                    Save {c.discountPct}%
                  </span>
                ) : null}
              </div>
              <p className="mt-4 text-2xl font-bold">
                ₹{c.price.toLocaleString("en-IN")}
              </p>
              <p className="mt-2 text-sm font-medium text-amber-200">
                {c.slotsLeft != null && c.slotsLeft <= 8
                  ? `Only ${c.slotsLeft} slots left — fills fast on weekends`
                  : "Only 5 slots left this week for combo timings"}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <AddToCartButton
                  variant="package"
                  id={c.id}
                  name={c.name}
                  price={c.price}
                  image={c.imageUrl}
                  duration={c.duration}
                  size="sm"
                  className="!border-white/80 !bg-white/10 !text-white hover:!bg-white/20"
                />
                <Link
                  href={`/booking?package=${encodeURIComponent(c.id)}`}
                  className="inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-ocean-900"
                >
                  Grab combo
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
