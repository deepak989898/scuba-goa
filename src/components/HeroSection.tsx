"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import { useHeroSlides } from "@/hooks/useHeroSlides";

function HeroButtons() {
  return (
    <div className="flex flex-wrap gap-1.5 sm:gap-3">
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
  );
}

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

  const eyebrow = (
    <p className="text-xs font-medium uppercase tracking-widest text-white/90 sm:text-sm">
      Goa, India · Premium marine experiences
    </p>
  );

  return (
    <section className="relative min-h-[calc(38vw+47px)] overflow-hidden bg-ocean-900 sm:min-h-[88vh]">
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
                className="object-cover object-center"
                sizes="100vw"
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
        <div className="absolute inset-0 bg-hero-overlay" />
      </div>

      {/* Mobile: eyebrow top-left, CTAs bottom-left */}
      <div className="relative z-10 mx-auto flex min-h-[calc(38vw+47px)] max-w-7xl flex-col justify-between px-4 pb-5 pt-3 sm:hidden">
        <div className="self-start">{eyebrow}</div>
        <div className="self-start">
          <HeroButtons />
        </div>
      </div>

      {/* sm+ */}
      <div className="relative z-10 mx-auto hidden min-h-[88vh] max-w-7xl flex-col justify-end px-4 pb-16 pt-28 sm:flex lg:justify-center lg:px-8 lg:pb-0 lg:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl"
        >
          {eyebrow}
          <div className="mt-4 sm:mt-8">
            <HeroButtons />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
