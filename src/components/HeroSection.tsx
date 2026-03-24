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
    <section className="relative min-h-[38vw] overflow-hidden bg-ocean-900 sm:min-h-[88vh]">
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
      <div className="relative z-10 mx-auto flex min-h-[38vw] max-w-7xl flex-col justify-end px-4 pb-6 pt-12 sm:min-h-[88vh] sm:px-6 sm:pb-16 sm:pt-28 lg:px-8 lg:justify-center lg:pb-0 lg:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl"
        >
          <p className="text-xs font-medium uppercase tracking-widest text-white/90 sm:text-sm">
            Goa, India · Premium marine experiences
          </p>
          <h1 className="mt-1.5 font-display text-2xl font-bold leading-tight text-white sm:mt-3 sm:text-5xl lg:text-6xl">
            Experience Goa Like Never Before 🌊
          </h1>
          <p className="mt-1.5 text-sm text-white/90 sm:mt-4 sm:text-xl">
            Scuba Diving | Water Sports | Goa Tours
          </p>
          <div className="mt-4 flex flex-wrap gap-1.5 sm:mt-8 sm:gap-3">
            <Link
              href="/booking"
              className="inline-flex rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-ocean-800 shadow-lg transition hover:bg-ocean-50 sm:px-6 sm:py-3 sm:text-sm"
            >
              Book Now
            </Link>
            <Link
              href="/services"
              className="inline-flex rounded-full border-2 border-white/80 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 sm:px-6 sm:py-3 sm:text-sm"
            >
              Explore Packages
            </Link>
          </div>
          <p className="mt-3 text-[11px] leading-snug text-white/80 sm:mt-6 sm:text-sm">
            Instant WhatsApp confirmations · Razorpay secure pay · 10,000+ happy
            guests
          </p>
        </motion.div>
      </div>
    </section>
  );
}
