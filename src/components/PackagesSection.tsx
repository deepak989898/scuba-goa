"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import { usePackages } from "@/hooks/usePackages";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { SocialShareButtons } from "@/components/SocialShareButtons";

export function PackagesSection() {
  const { packages, loading } = usePackages();

  return (
    <section
      className="bg-gradient-to-b from-ocean-50/80 to-white pt-[clamp(4.5rem,18vw,7rem)] pb-10 sm:pt-5 sm:pb-14"
      id="packages"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold text-ocean-900 sm:text-3xl lg:text-4xl">
              Pick your dive — prices lock at checkout
            </h2>
            <p className="mt-1.5 text-sm font-medium text-ocean-800 sm:text-base">
              No sticker shock: what you see here is what you pay. Add to cart or hit
              Book while your dates still work — popular slots disappear on weekends.
            </p>
          </div>
          <Link
            href="/booking"
            className="text-xs font-bold text-ocean-700 hover:text-ocean-900 sm:text-sm"
          >
            Open full checkout →
          </Link>
        </div>
        {loading ? (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:mt-6 sm:gap-6 lg:grid-cols-3">
            {[1, 2, 3].map((k) => (
              <div
                key={k}
                className="h-96 animate-pulse rounded-2xl bg-ocean-100/80"
              />
            ))}
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:mt-6 sm:gap-6 lg:grid-cols-3">
            {packages.map((p, idx) => {
              const cardImage =
                p.imageUrl?.trim() ||
                "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=75";
              return (
              <motion.article
                key={p.id}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                className="u-depth-card flex flex-col overflow-hidden rounded-2xl border border-ocean-100 bg-white"
              >
                <div className="relative aspect-[3/2] sm:aspect-[5/4]">
                  <CmsRemoteImage
                    src={cardImage}
                    alt={p.name}
                    fill
                    className="object-cover"
                    sizes="(max-width:640px) 50vw, (max-width:1024px) 100vw, 33vw"
                    loading="lazy"
                  />
                  {p.isCombo && p.discountPct ? (
                    <span className="absolute right-1.5 top-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white sm:right-3 sm:top-3 sm:px-2 sm:text-xs">
                      {p.discountPct}% OFF
                    </span>
                  ) : null}
                  {p.limitedSlots ? (
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-red-600/90 px-1.5 py-0.5 text-[10px] font-semibold text-white sm:left-3 sm:top-3 sm:px-2 sm:text-xs">
                      Limited Slots
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col p-2.5 sm:p-5">
                  <p className="text-[9px] font-medium uppercase tracking-wide text-ocean-500 sm:text-xs">
                    {p.category ?? "Goa"}
                  </p>
                  <h3 className="mt-0.5 font-display text-sm font-semibold leading-snug text-ocean-900 sm:mt-1 sm:text-xl">
                    {p.name}
                  </h3>
                  <p className="mt-0.5 text-[11px] text-ocean-600 sm:mt-1 sm:text-sm">{p.duration}</p>
                  <p className="mt-1 text-[11px] font-medium text-amber-700 sm:mt-2 sm:text-sm">
                    ⭐ {p.rating.toFixed(1)} rated
                  </p>
                  <ul className="mt-1.5 flex flex-wrap gap-0.5 sm:mt-3 sm:gap-1.5">
                    {p.includes.map((inc, i) => (
                      <li
                        key={`${p.id}-inc-${i}`}
                        className="rounded-full bg-ocean-50 px-1 py-0.5 text-[9px] text-ocean-800 sm:px-2 sm:text-xs"
                      >
                        {inc}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 flex flex-wrap items-center gap-1 text-[9px] text-ocean-600 sm:mt-4 sm:gap-2 sm:text-xs">
                    {p.slotsLeft != null ? (
                      <span className="font-semibold text-red-600">
                        Only {p.slotsLeft} slots left
                      </span>
                    ) : null}
                    {p.bookedToday != null ? (
                      <span>Booked {p.bookedToday} times today</span>
                    ) : null}
                  </div>
                  {/*
                    Keep price + copy stacked (flex-col) at all breakpoints. A side-by-side
                    row (sm:flex-row + flex-1) squeezed the price column in 2–3 column grids,
                    and overflow-hidden on the card clipped the amount + forced one-word lines.
                  */}
                  <div className="mt-auto flex flex-col gap-2 pt-2 sm:gap-3 sm:pt-4">
                    <div className="w-full min-w-0">
                      <div className="rounded-xl border-2 border-amber-400/60 bg-gradient-to-br from-slate-950 via-ocean-950 to-ocean-900 px-2.5 py-2 shadow-lg shadow-ocean-950/30 sm:px-3 sm:py-2.5">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-200 sm:text-xs">
                          Today&apos;s live price
                        </p>
                        <p className="mt-0.5 font-display text-xl font-extrabold tabular-nums leading-none tracking-tight text-white sm:text-2xl lg:text-3xl">
                          ₹{p.price.toLocaleString("en-IN")}
                        </p>
                      </div>
                      <p className="mt-1.5 max-w-full text-pretty text-[10px] font-bold leading-snug text-red-700 sm:text-xs">
                        {p.slotsLeft != null
                          ? `Book now: only ${p.slotsLeft} slots left for this rate`
                          : "Book now to lock this rate"}
                      </p>
                    </div>
                    <div className="flex w-full min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
                      <AddToCartButton
                        variant="package"
                        id={p.id}
                        name={p.name}
                        price={p.price}
                        image={cardImage}
                        duration={p.duration}
                        size="sm"
                      />
                      <Link
                        href={`/booking?package=${encodeURIComponent(p.id)}`}
                        className="inline-flex items-center justify-center rounded-full border-2 border-cyan-300/80 bg-ocean-gradient px-2.5 py-1 text-center text-[10px] font-extrabold text-white shadow-lg shadow-ocean-950/35 transition hover:brightness-110 active:brightness-95 sm:px-4 sm:py-2 sm:text-sm"
                      >
                        Lock this price
                      </Link>
                      <SocialShareButtons
                        title={p.name}
                        path={`/booking?package=${encodeURIComponent(p.id)}`}
                        compact
                      />
                    </div>
                  </div>
                </div>
              </motion.article>
            );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
