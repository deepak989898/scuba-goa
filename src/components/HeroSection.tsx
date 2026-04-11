"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { HeroSlideBackground } from "@/components/HeroSlideBackground";
import { HeroVideoSoundToggle } from "@/components/HeroVideoSoundToggle";
import { useHeroSlides } from "@/hooks/useHeroSlides";
import { usePackages } from "@/hooks/usePackages";
import { useServices } from "@/hooks/useServices";
import { whatsappLink } from "@/lib/constants";
import { ADVANCE_BOOKING_INR } from "@/lib/payment";
import { resolveHeroBookingCardModel } from "@/lib/hero-slide-booking";
import type { PackageDoc } from "@/lib/types";

function lowestListedPackageInr(list: PackageDoc[]): number | null {
  const nums = list
    .map((p) => p.price)
    .filter((n) => Number.isFinite(n) && n > 0);
  if (!nums.length) return null;
  return Math.min(...nums);
}

function HeroConversionCard({
  bookHref,
  headlineTitle,
  headlinePriceInr,
  priceLoading,
  slotsToday,
  perksLine,
  waPreset,
  primaryCtaLabel,
}: {
  bookHref: string;
  headlineTitle: string;
  headlinePriceInr: number | null;
  priceLoading: boolean;
  slotsToday: number | null;
  perksLine: string;
  waPreset: string;
  primaryCtaLabel: string;
}) {
  const [phone, setPhone] = useState("");
  const [phoneErr, setPhoneErr] = useState<string | null>(null);

  const priceLine =
    headlinePriceInr != null &&
    Number.isFinite(headlinePriceInr) &&
    headlinePriceInr > 0
      ? `₹${headlinePriceInr.toLocaleString("en-IN")}`
      : null;

  const waBooking = whatsappLink(waPreset);

  const bookPrimaryClass =
    "inline-flex min-h-11 w-full touch-manipulation items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-ocean-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-ocean-900/35 ring-2 ring-cyan-300/50 transition hover:brightness-110 active:brightness-95 sm:text-sm";

  const whatsappSecondaryClass =
    "inline-flex min-h-11 w-full touch-manipulation items-center justify-center rounded-full border-2 border-emerald-400/90 bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-md shadow-emerald-950/30 ring-1 ring-emerald-300/50 transition hover:bg-emerald-500 active:bg-emerald-700 sm:text-sm";

  const telInputClass =
    "mt-1 w-full rounded-lg border border-white/25 bg-white/10 px-2 py-1.5 text-xs text-white placeholder:text-white/50 focus:border-cyan-300/80 focus:outline-none focus:ring-1 focus:ring-cyan-300/60 max-sm:border-ocean-200 max-sm:bg-white max-sm:text-ocean-900 max-sm:placeholder:text-ocean-400 max-sm:focus:border-ocean-500 max-sm:focus:ring-ocean-400 sm:rounded-xl sm:px-3 sm:py-2 sm:text-sm";

  function openWhatsAppWithNumber() {
    setPhoneErr(null);
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setPhoneErr("Enter a valid 10-digit mobile.");
      return;
    }
    const text = `${waPreset} My WhatsApp number: ${digits}. Please confirm slot and payment.`;
    window.open(whatsappLink(text), "_blank", "noopener,noreferrer");
  }

  return (
    <div className="rounded-lg border border-white/20 bg-white/10 p-2 shadow-lg backdrop-blur-md u-hero-3d max-sm:border-ocean-200/90 max-sm:bg-white/95 max-sm:shadow-xl sm:rounded-3xl sm:p-5 sm:shadow-none">
      <p className="text-center font-display text-base font-extrabold tabular-nums leading-tight text-cyan-600 max-sm:text-ocean-900 sm:text-xl sm:text-cyan-100">
        {priceLoading && !priceLine ? (
          <span className="text-xs font-semibold text-white/80 max-sm:text-ocean-600">
            Loading price…
          </span>
        ) : priceLine ? (
          <>
            <span className="block sm:inline">{headlineTitle}</span>
            <span className="block text-cyan-700 max-sm:inline sm:text-cyan-200">
              {" "}
              @ {priceLine}
            </span>
            <span className="mt-1 block text-[10px] font-semibold normal-case tracking-normal text-ocean-700 max-sm:text-ocean-700 sm:text-xs sm:text-cyan-50/95">
              Pay ₹{ADVANCE_BOOKING_INR.toLocaleString("en-IN")} now · rest on the day at the
              centre
            </span>
          </>
        ) : (
          <>
            {headlineTitle}
            <span className="mt-1 block text-[10px] font-semibold text-ocean-700 sm:text-cyan-100/90">
              Pay ₹{ADVANCE_BOOKING_INR.toLocaleString("en-IN")} now · rest on the day
            </span>
          </>
        )}
      </p>

      <p className="mt-2 text-center text-[10px] font-medium leading-snug text-ocean-800 max-sm:text-ocean-800 sm:text-xs sm:text-white/90">
        {perksLine}
      </p>
      {slotsToday != null && slotsToday > 0 ? (
        <p className="mt-1.5 text-center text-[10px] font-bold uppercase tracking-wide text-amber-200 max-sm:text-amber-800 sm:text-xs sm:text-amber-200">
          Only {slotsToday} slots left today
        </p>
      ) : null}

      <div className="mt-3 flex flex-col gap-2 sm:mt-4 sm:gap-3">
        <Link href={bookHref} className={bookPrimaryClass}>
          {primaryCtaLabel}
        </Link>
        <a
          href={waBooking}
          target="_blank"
          rel="noopener noreferrer"
          className={whatsappSecondaryClass}
        >
          WhatsApp booking
        </a>
      </div>

      {/* Desktop/tablet only — keeps hero compact on mobile (sticky bar + WhatsApp booking button). */}
      <div className="mt-3 hidden rounded-lg border border-white/15 bg-black/10 p-2 sm:block sm:bg-white/5">
        <p className="text-center text-[10px] font-semibold uppercase tracking-wide text-white/80">
          Or enter mobile — opens WhatsApp
        </p>
        <label className="mt-1 block text-[9px] font-medium text-white/85 sm:text-xs">
          Mobile (India)
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className={telInputClass}
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setPhoneErr(null);
            }}
            placeholder="10-digit number"
          />
        </label>
        {phoneErr ? (
          <p className="mt-1 text-center text-[9px] text-red-200" role="alert">
            {phoneErr}
          </p>
        ) : null}
        <button
          type="button"
          onClick={openWhatsAppWithNumber}
          className="mt-2 w-full touch-manipulation rounded-full border border-white/30 bg-white/10 py-2 text-[10px] font-bold text-white transition hover:bg-white/20 sm:text-xs"
        >
          Continue on WhatsApp
        </button>
      </div>
    </div>
  );
}

export function HeroSection() {
  const { slides } = useHeroSlides();
  const { packages, loading: packagesLoading } = usePackages();
  const { services, loading: servicesLoading } = useServices();
  const fromPriceInr = useMemo(
    () => lowestListedPackageInr(packages),
    [packages],
  );
  const scuba = useMemo(
    () => services.find((s) => s.slug === "scuba-diving"),
    [services],
  );
  const headlinePriceInr = useMemo(() => {
    const p = scuba?.priceFrom;
    if (typeof p === "number" && Number.isFinite(p) && p > 0) return p;
    return fromPriceInr;
  }, [scuba, fromPriceInr]);
  const priceLoading = packagesLoading || servicesLoading;
  const fallbackSlots =
    scuba?.slotsLeft != null && scuba.slotsLeft > 0 ? scuba.slotsLeft : null;
  const [i, setI] = useState(0);
  const n = slides.length;
  /** User-controlled hero video / site-music sound (starts off = muted). */
  const [heroSoundOn, setHeroSoundOn] = useState(false);

  const advanceSlide = useCallback(() => {
    setI((prev) => {
      if (n <= 1) return prev;
      return (prev + 1) % n;
    });
  }, [n]);

  useEffect(() => {
    setI((x) => (n > 0 ? x % n : 0));
  }, [n]);

  const currentHasVideo = Boolean(slides[i]?.videoUrl?.trim());

  useEffect(() => {
    if (n <= 1) return;
    if (currentHasVideo) return;
    const t = window.setInterval(() => advanceSlide(), 5500);
    return () => window.clearInterval(t);
  }, [n, i, advanceSlide, currentHasVideo]);

  const current = slides[i] ?? slides[0];
  const slideKey = current
    ? `${current.videoUrl ?? ""}|${current.src}|${current.videoThumbnailUrl ?? ""}|${i}`
    : "hero-empty";

  const bookingCard = useMemo(
    () =>
      resolveHeroBookingCardModel(current?.bookingOption, {
        packages,
        services,
        fallbackHeadlinePrice: headlinePriceInr,
        fallbackSlots,
      }),
    [
      current?.bookingOption,
      packages,
      services,
      headlinePriceInr,
      fallbackSlots,
    ],
  );

  return (
    <section className="relative isolate -mt-20 overflow-visible bg-ocean-900 pt-20 max-sm:z-20 max-sm:min-h-[min(52dvh,420px)] sm:z-auto sm:-mt-[5.25rem] sm:min-h-[88vh] sm:overflow-hidden sm:pt-[5.25rem]">
      {/* Clip slides to hero box only; section can overflow on mobile for straddle card */}
      <div className="absolute inset-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {current ? (
            <motion.div
              key={slideKey}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0"
            >
              <HeroSlideBackground
                slide={current}
                slideKey={slideKey}
                onVideoEnded={advanceSlide}
                shouldLoopWhenSingleSlide={n <= 1}
                heroSoundEnabled={heroSoundOn}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
        <div className="absolute inset-0 bg-hero-overlay" />
      </div>

      {currentHasVideo ? (
        <div className="pointer-events-none absolute inset-0 z-[25] flex items-start justify-end p-3 pt-24 sm:items-end sm:justify-end sm:p-6 sm:pt-6 sm:pb-28">
          <HeroVideoSoundToggle
            soundOn={heroSoundOn}
            onToggle={() => setHeroSoundOn((v) => !v)}
          />
        </div>
      ) : null}

      {/* Mobile: keep hero image clean — no text on photo (CTAs: sticky bar + form + trust strip) */}
      <h1 className="sr-only">
        Scuba diving in Goa with Book Scuba Goa — beginner-friendly dives in North Goa.
        {headlinePriceInr != null
          ? ` Try-dive from ₹${headlinePriceInr.toLocaleString("en-IN")}.`
          : ""}{" "}
        Pay ₹{ADVANCE_BOOKING_INR} advance online with Razorpay; WhatsApp booking supported.
      </h1>
      {/* Mobile: ~40% of form on hero, ~60% below hero (above urgency strip); bottom-aligned then translateY(60% of card height) */}
      <div className="pointer-events-none absolute inset-0 z-20 flex w-full items-end justify-center px-[14px] pb-0 sm:hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45 }}
          className="pointer-events-auto relative z-30 w-full min-w-0 max-w-none"
        >
          <div className="w-full min-w-0 translate-y-[60%]">
            <HeroConversionCard
              bookHref={bookingCard.bookHref}
              headlineTitle={bookingCard.headlineTitle}
              headlinePriceInr={bookingCard.headlinePriceInr}
              priceLoading={priceLoading}
              slotsToday={bookingCard.slotsToday}
              perksLine={bookingCard.perksLine}
              waPreset={bookingCard.waPreset}
              primaryCtaLabel={bookingCard.primaryCtaLabel}
            />
          </div>
        </motion.div>
      </div>

      {/* sm+: bottom-right in hero */}
      <div className="pointer-events-none absolute inset-0 z-10 hidden items-end justify-end p-6 pb-8 sm:flex lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="pointer-events-auto w-full max-w-sm md:max-w-md"
        >
          <HeroConversionCard
            bookHref={bookingCard.bookHref}
            headlineTitle={bookingCard.headlineTitle}
            headlinePriceInr={bookingCard.headlinePriceInr}
            priceLoading={priceLoading}
            slotsToday={bookingCard.slotsToday}
            perksLine={bookingCard.perksLine}
            waPreset={bookingCard.waPreset}
            primaryCtaLabel={bookingCard.primaryCtaLabel}
          />
        </motion.div>
      </div>
    </section>
  );
}
