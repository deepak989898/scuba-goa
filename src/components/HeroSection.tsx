"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import { useHeroSlides } from "@/hooks/useHeroSlides";

export function HeroSection() {
  const { slides } = useHeroSlides();
  const [i, setI] = useState(0);
  const n = slides.length;

  useEffect(() => {
    setI((x) => (n > 0 ? x % n : 0));
  }, [n]);

  useEffect(() => {
    if (n <= 1) return;
    const t = setInterval(() => setI((x) => (x + 1) % n), 5500);
    return () => clearInterval(t);
  }, [n]);

  const current = slides[i] ?? slides[0];

  return (
    <section className="relative min-h-[88vh] overflow-hidden bg-ocean-900">
      <div className="absolute inset-0">
        <AnimatePresence mode="wait">
          {current ? (
            <motion.div
              key={current.src}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0"
            >
              <CmsRemoteImage
                src={current.src}
                alt={current.alt}
                fill
                priority
                className="object-cover"
                sizes="100vw"
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
        <div className="absolute inset-0 bg-hero-overlay" />
      </div>
      <div className="relative z-10 mx-auto flex min-h-[88vh] max-w-7xl flex-col justify-end px-4 pb-16 pt-28 sm:px-6 lg:px-8 lg:justify-center lg:pb-0 lg:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl"
        >
          <p className="text-sm font-medium uppercase tracking-widest text-white/90">
            Goa, India · Premium marine experiences
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
            Experience Goa Like Never Before 🌊
          </h1>
          <p className="mt-4 text-lg text-white/90 sm:text-xl">
            Scuba Diving | Water Sports | Goa Tours
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/booking"
              className="inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-ocean-800 shadow-lg transition hover:bg-ocean-50"
            >
              Book Now
            </Link>
            <Link
              href="/services"
              className="inline-flex rounded-full border-2 border-white/80 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              Explore Packages
            </Link>
          </div>
          <p className="mt-6 text-sm text-white/80">
            Instant WhatsApp confirmations · Razorpay secure pay · 10,000+ happy
            guests
          </p>
        </motion.div>
        <div className="mt-10 flex gap-2 lg:absolute lg:bottom-10 lg:left-1/2 lg:-translate-x-1/2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              aria-label={`Slide ${idx + 1}`}
              onClick={() => setI(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === i ? "w-8 bg-white" : "w-2 bg-white/40"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
