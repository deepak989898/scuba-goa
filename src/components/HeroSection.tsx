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
    <section className="relative min-h-[60vw] overflow-hidden bg-ocean-900 sm:min-h-[88vh]">
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
      <div className="relative z-10 mx-auto flex min-h-[60vw] max-w-7xl flex-col justify-end px-4 pb-8 pt-16 sm:min-h-[88vh] sm:px-6 sm:pb-16 sm:pt-28 lg:px-8 lg:justify-center lg:pb-0 lg:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl"
        >
          <p className="text-sm font-medium uppercase tracking-widest text-white/90">
            Goa, India · Premium marine experiences
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold leading-tight text-white sm:mt-3 sm:text-5xl lg:text-6xl">
            Experience Goa Like Never Before 🌊
          </h1>
          <p className="mt-2 text-base text-white/90 sm:mt-4 sm:text-xl">
            Scuba Diving | Water Sports | Goa Tours
          </p>
          <div className="mt-5 flex flex-wrap gap-2 sm:mt-8 sm:gap-3">
            <Link
              href="/booking"
              className="inline-flex rounded-full bg-white px-4 py-2 text-xs font-semibold text-ocean-800 shadow-lg transition hover:bg-ocean-50 sm:px-6 sm:py-3 sm:text-sm"
            >
              Book Now
            </Link>
            <Link
              href="/services"
              className="inline-flex rounded-full border-2 border-white/80 bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 sm:px-6 sm:py-3 sm:text-sm"
            >
              Explore Packages
            </Link>
          </div>
          <p className="mt-4 text-xs text-white/80 sm:mt-6 sm:text-sm">
            Instant WhatsApp confirmations · Razorpay secure pay · 10,000+ happy
            guests
          </p>
        </motion.div>
        <div className="mt-6 flex gap-2 sm:mt-10 lg:absolute lg:bottom-10 lg:left-1/2 lg:-translate-x-1/2">
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
