"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { HeroSlideBackground } from "@/components/HeroSlideBackground";
import { HeroVideoSoundToggle } from "@/components/HeroVideoSoundToggle";
import { useHeroSlides } from "@/hooks/useHeroSlides";
import { usePackages } from "@/hooks/usePackages";
import { useServices } from "@/hooks/useServices";
import { useShouldRenderHeroVideo } from "@/hooks/useShouldRenderHeroVideo";
import { SITE_NAME } from "@/lib/constants";
import { ADVANCE_BOOKING_INR } from "@/lib/payment";
import { resolveHeroBookingCardModel } from "@/lib/hero-slide-booking";
import {
  computeMobileHeroCardOverlapPx,
  computeMobileHeroMediaHeightPx,
} from "@/lib/hero-mobile-media-height";
import { getYoutubeVideoId } from "@/lib/hero-video";
import type { PackageDoc } from "@/lib/types";

function lowestListedPackageInr(list: PackageDoc[]): number | null {
  const nums = list
    .map((p) => p.price)
    .filter((n) => Number.isFinite(n) && n > 0);
  if (!nums.length) return null;
  return Math.min(...nums);
}

/**
 * First-viewport conversion card: brand + one offer line + one primary CTA.
 * WhatsApp / long forms live elsewhere so the hero stays uncluttered (LOW_CTR fix).
 */
function HeroConversionCard({
  bookHref,
  detailsHref,
  headlineTitle,
  headlinePriceInr,
  priceLoading,
  perksLine,
  primaryCtaLabel,
}: {
  bookHref: string;
  detailsHref: string;
  headlineTitle: string;
  headlinePriceInr: number | null;
  priceLoading: boolean;
  perksLine: string;
  primaryCtaLabel: string;
}) {
  const priceLine =
    headlinePriceInr != null &&
    Number.isFinite(headlinePriceInr) &&
    headlinePriceInr > 0
      ? `₹${headlinePriceInr.toLocaleString("en-IN")}`
      : null;

  const bookPrimaryClass =
    "inline-flex min-h-12 w-full touch-manipulation items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-ocean-600 px-5 py-3.5 text-base font-extrabold text-white shadow-lg shadow-ocean-900/35 ring-2 ring-cyan-300/50 transition hover:brightness-110 active:brightness-95";

  const detailsSecondaryClass =
    "inline-flex min-h-10 w-full touch-manipulation items-center justify-center rounded-full border-2 border-ocean-600 bg-white/90 px-4 py-2 text-xs font-bold text-ocean-900 shadow-md transition hover:bg-white sm:border-white/80 sm:bg-black/25 sm:text-white sm:hover:bg-black/35";

  return (
    <div className="rounded-lg border border-transparent bg-transparent p-3 u-hero-3d sm:rounded-3xl sm:border-white/20 sm:bg-white/10 sm:p-5 sm:shadow-lg sm:backdrop-blur-md">
      <p className="text-center text-[11px] font-bold uppercase tracking-[0.14em] text-ocean-700 sm:text-cyan-100 sm:drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
        {SITE_NAME}
      </p>
      <p className="mt-1 text-center font-display text-xl font-extrabold leading-tight text-ocean-950 sm:text-2xl sm:text-white sm:drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
        {headlineTitle}
      </p>

      <p className="mt-2 text-center text-sm font-semibold text-ocean-800 sm:text-cyan-50 sm:drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
        {priceLoading && !priceLine ? (
          <span className="text-xs font-semibold opacity-90">Loading price…</span>
        ) : priceLine ? (
          <>
            From {priceLine}
            <span className="mt-0.5 block text-[11px] font-medium text-ocean-700 sm:text-white/95">
              Pay ₹{ADVANCE_BOOKING_INR.toLocaleString("en-IN")} online · rest at the centre
            </span>
          </>
        ) : (
          <span className="text-[11px] font-medium text-ocean-700 sm:text-white/95">
            Pay ₹{ADVANCE_BOOKING_INR.toLocaleString("en-IN")} online · rest at the centre
          </span>
        )}
      </p>

      {perksLine ? (
        <p className="mt-2 text-center text-[11px] font-medium leading-snug text-ocean-700 sm:text-white sm:drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
          {perksLine}
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-2">
        <Link href={bookHref} className={bookPrimaryClass}>
          {primaryCtaLabel}
        </Link>
        <Link href={detailsHref} className={detailsSecondaryClass}>
          See prices &amp; packages
        </Link>
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
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const [nativeVideoAspect, setNativeVideoAspect] = useState<{
    w: number;
    h: number;
  } | null>(null);

  useEffect(() => {
    const update = () =>
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);

  const advanceSlide = useCallback(() => {
    setI((prev) => {
      if (n <= 1) return prev;
      return (prev + 1) % n;
    });
  }, [n]);

  useEffect(() => {
    setI((x) => (n > 0 ? x % n : 0));
  }, [n]);

  const videoActuallyPlays = useShouldRenderHeroVideo();
  const currentHasVideo = Boolean(slides[i]?.videoUrl?.trim());
  // On mobile / Save-Data we render the poster instead of the <video>, so the
  // `onEnded` callback never fires. Keep the slider moving with the timer.
  const useTimerAdvance = !currentHasVideo || !videoActuallyPlays;

  useEffect(() => {
    if (n <= 1) return;
    if (!useTimerAdvance) return;
    const t = window.setInterval(() => advanceSlide(), 5500);
    return () => window.clearInterval(t);
  }, [n, i, advanceSlide, useTimerAdvance]);

  const current = slides[i] ?? slides[0];
  const slideKey = current
    ? `${current.videoUrl ?? ""}|${current.src}|${current.videoThumbnailUrl ?? ""}|${i}`
    : "hero-empty";

  useEffect(() => {
    setNativeVideoAspect(null);
  }, [slideKey]);

  const currentVideoUrl = current?.videoUrl?.trim() ?? "";
  const currentYtId = currentVideoUrl ? getYoutubeVideoId(currentVideoUrl) : null;

  const mobileMediaHeightPx = useMemo(() => {
    if (viewport.w === 0 || viewport.w >= 640) return null;
    if (!currentHasVideo || !videoActuallyPlays) return null;

    if (currentYtId) {
      return computeMobileHeroMediaHeightPx(viewport.w, viewport.h, 16, 9);
    }

    if (nativeVideoAspect && nativeVideoAspect.w > 0 && nativeVideoAspect.h > 0) {
      return computeMobileHeroMediaHeightPx(
        viewport.w,
        viewport.h,
        nativeVideoAspect.w,
        nativeVideoAspect.h,
      );
    }

    return null;
  }, [
    viewport.w,
    viewport.h,
    currentHasVideo,
    videoActuallyPlays,
    currentYtId,
    nativeVideoAspect,
  ]);

  const mobileCardOverlapPx = useMemo(() => {
    if (mobileMediaHeightPx == null || viewport.w >= 640) return null;
    return computeMobileHeroCardOverlapPx(mobileMediaHeightPx, viewport.w);
  }, [mobileMediaHeightPx, viewport.w]);

  const mobileMediaHeightStyle =
    mobileMediaHeightPx != null
      ? { height: `${mobileMediaHeightPx}px`, minHeight: `${mobileMediaHeightPx}px` }
      : undefined;

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
    <section className="relative isolate -mt-20 overflow-visible bg-white pt-20 sm:-mt-[4.75rem] sm:min-h-[min(72vh,640px)] sm:overflow-hidden sm:bg-ocean-900 sm:pt-[4.75rem]">
      {/*
        Mobile: taller hero media + deeper card overlap so the ocean-blue band
        under the booking card is covered / not visible.
      */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 overflow-hidden sm:bottom-0 sm:h-auto ${
          mobileMediaHeightPx != null
            ? "max-sm:h-auto"
            : "max-sm:h-[min(58dvh,460px)]"
        }`}
        style={mobileMediaHeightStyle}
      >
        {current ? (
          <div key={slideKey} className="absolute inset-0">
            <HeroSlideBackground
              slide={current}
              slideKey={slideKey}
              onVideoEnded={advanceSlide}
              shouldLoopWhenSingleSlide={n <= 1}
              heroSoundEnabled={heroSoundOn}
              mobileFitMedia={mobileMediaHeightPx != null}
              onNativeVideoMetrics={(w, h) => setNativeVideoAspect({ w, h })}
            />
          </div>
        ) : null}
        <div className="absolute inset-0 bg-hero-overlay" />
      </div>

      <div
        className={`relative sm:min-h-[min(72vh,640px)] ${
          mobileMediaHeightPx != null
            ? "max-sm:min-h-0"
            : "max-sm:min-h-[min(58dvh,460px)]"
        }`}
        style={mobileMediaHeightStyle}
      >
        {currentHasVideo && videoActuallyPlays ? (
          <div className="pointer-events-none absolute inset-0 z-[25] flex items-start justify-end p-3 pt-24 sm:items-end sm:justify-end sm:p-6 sm:pt-6 sm:pb-28">
            <HeroVideoSoundToggle
              soundOn={heroSoundOn}
              onToggle={() => setHeroSoundOn((v) => !v)}
            />
          </div>
        ) : null}

        <h1 className="sr-only">
          Scuba diving Goa — book online with {SITE_NAME}.
          {headlinePriceInr != null
            ? ` Try-dive from ₹${headlinePriceInr.toLocaleString("en-IN")}.`
            : ""}{" "}
          Pay ₹{ADVANCE_BOOKING_INR} advance online; rest at the centre.
        </h1>

        <div className="pointer-events-none absolute inset-0 z-10 hidden items-end justify-end p-6 pb-8 sm:flex lg:px-8">
          <div className="pointer-events-auto w-full max-w-sm md:max-w-md">
            <HeroConversionCard
              bookHref={bookingCard.bookHref}
              detailsHref={bookingCard.detailsHref}
              headlineTitle={bookingCard.headlineTitle}
              headlinePriceInr={bookingCard.headlinePriceInr}
              priceLoading={priceLoading}
              perksLine={bookingCard.perksLine}
              primaryCtaLabel={bookingCard.primaryCtaLabel}
            />
          </div>
        </div>
      </div>

      {/* Overlap booking card into hero — overlap scales when media is shorter */}
      <div
        className={`relative z-10 px-[14px] pb-2 sm:hidden ${
          mobileCardOverlapPx == null ? "-mt-[min(28vw,9.5rem)]" : ""
        }`}
        style={
          mobileCardOverlapPx != null
            ? { marginTop: -mobileCardOverlapPx }
            : undefined
        }
      >
        <HeroConversionCard
          bookHref={bookingCard.bookHref}
          detailsHref={bookingCard.detailsHref}
          headlineTitle={bookingCard.headlineTitle}
          headlinePriceInr={bookingCard.headlinePriceInr}
          priceLoading={priceLoading}
          perksLine={bookingCard.perksLine}
          primaryCtaLabel={bookingCard.primaryCtaLabel}
        />
      </div>
    </section>
  );
}
