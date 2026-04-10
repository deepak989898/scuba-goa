"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { HeroSlideBackground } from "@/components/HeroSlideBackground";
import { useHeroSlides } from "@/hooks/useHeroSlides";
import { usePackages } from "@/hooks/usePackages";
import { whatsappLink } from "@/lib/constants";
import type { PackageDoc } from "@/lib/types";

const LEAD_SID_KEY = "bsg_marketing_sid";

function getLeadSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = sessionStorage.getItem(LEAD_SID_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `m_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(LEAD_SID_KEY, id);
    }
    return id;
  } catch {
    return `m_${Date.now()}`;
  }
}

function lowestListedPackageInr(list: PackageDoc[]): number | null {
  const nums = list
    .map((p) => p.price)
    .filter((n) => Number.isFinite(n) && n > 0);
  if (!nums.length) return null;
  return Math.min(...nums);
}

function HeroQuickBookingPanel({
  packages,
  loading,
  fromPriceInr,
}: {
  packages: PackageDoc[];
  loading: boolean;
  fromPriceInr: number | null;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [interestedItem, setInterestedItem] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [mobileFormOpen, setMobileFormOpen] = useState(false);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!mobileFormOpen) return;
    const t = window.setTimeout(() => phoneInputRef.current?.focus(), 180);
    return () => window.clearTimeout(t);
  }, [mobileFormOpen]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setMsg("Please enter a valid phone number.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/marketing/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          interestedItem:
            interestedItem.trim() || "Quick booking — hero",
          preferredDate: preferredDate.trim(),
          source: "hero_quick",
          sessionId: getLeadSessionId(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error ?? "Could not send. Try again.");
        return;
      }
      setMsg("Thanks! We’ll contact you shortly.");
      setPhone("");
      setName("");
      setPreferredDate("");
      setInterestedItem("");
    } catch {
      setMsg("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const wa = whatsappLink(
    "Hi, I’d like to book scuba / a tour in Goa (from your website)."
  );

  const inputClass =
    "mt-0.5 w-full min-h-0 rounded-md border px-1.5 py-1 text-[10px] focus:outline-none focus:ring-1 sm:mt-1 sm:rounded-xl sm:px-3 sm:py-2 sm:text-sm border-white/25 bg-white/10 text-white placeholder:text-white/50 focus:border-cyan-300/80 focus:ring-cyan-300/60 max-sm:border-ocean-200 max-sm:bg-white max-sm:text-ocean-900 max-sm:placeholder:text-ocean-400 max-sm:focus:border-ocean-500 max-sm:focus:ring-ocean-400";

  const bookSlotBtnClass =
    "inline-flex min-h-11 min-w-0 flex-1 touch-manipulation items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-ocean-600 px-3 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-ocean-900/35 ring-2 ring-cyan-300/50 transition hover:brightness-110 active:brightness-95 sm:min-h-11 sm:flex-none sm:px-5 sm:py-2.5 sm:text-sm";

  const whatsappSolidClass =
    "inline-flex min-h-11 min-w-0 flex-1 touch-manipulation items-center justify-center rounded-full bg-emerald-600 px-3 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-emerald-950/30 ring-2 ring-emerald-400/60 transition hover:bg-emerald-500 active:bg-emerald-700 sm:min-h-11 sm:flex-none sm:px-5 sm:py-2.5 sm:text-sm";

  const showMobileFields = mobileFormOpen;

  return (
    <div className="rounded-lg border border-white/20 bg-white/10 p-1.5 shadow-lg backdrop-blur-md u-hero-3d max-sm:border-ocean-200/90 max-sm:bg-white/95 max-sm:shadow-xl sm:rounded-3xl sm:p-5 sm:shadow-none">
      {fromPriceInr != null ? (
        <p className="mb-1 text-center font-display text-sm font-bold tabular-nums text-cyan-600 max-sm:text-base max-sm:text-ocean-900 sm:mb-2 sm:text-lg sm:text-cyan-200">
          From ₹{fromPriceInr.toLocaleString("en-IN")}
          <span className="block text-[9px] font-semibold normal-case tracking-normal text-ocean-600 max-sm:text-[10px] sm:text-[10px] sm:text-cyan-100/90">
            Live package price on site · ₹199 advance to lock
          </span>
        </p>
      ) : loading ? (
        <p className="mb-1 text-center text-[9px] font-medium text-ocean-600 max-sm:text-[10px] sm:mb-2 sm:text-xs sm:text-white/70">
          Loading live prices…
        </p>
      ) : null}

      {/* Mobile: compact 3-button row — expands to full form */}
      <div className="sm:hidden">
        {!showMobileFields ? (
          <div className="mt-2 space-y-2">
            <p className="text-center text-[10px] font-extrabold uppercase tracking-wide text-ocean-800">
              Quick actions
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setMobileFormOpen(true)}
                className="flex min-h-11 touch-manipulation flex-col items-center justify-center rounded-xl bg-ocean-900 px-1 py-1.5 text-center text-[9px] font-extrabold uppercase leading-tight text-white shadow-md shadow-ocean-950/40 ring-1 ring-ocean-700 active:scale-[0.98]"
              >
                Call me
              </button>
              <Link
                href="/booking"
                className="flex min-h-11 touch-manipulation flex-col items-center justify-center rounded-xl bg-gradient-to-b from-cyan-400 to-cyan-600 px-1 py-1.5 text-center text-[9px] font-extrabold uppercase leading-tight text-slate-950 shadow-md shadow-cyan-900/40 ring-1 ring-cyan-300 active:scale-[0.98]"
              >
                Book slot
              </Link>
              <button
                type="button"
                onClick={() => setMobileFormOpen(true)}
                className="flex min-h-11 touch-manipulation flex-col items-center justify-center rounded-xl bg-emerald-600 px-1 py-1.5 text-center text-[9px] font-extrabold uppercase leading-tight text-white shadow-md shadow-emerald-950/35 ring-1 ring-emerald-500 active:scale-[0.98]"
              >
                WhatsApp
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setMobileFormOpen(false);
              setMsg(null);
            }}
            className="mb-2 text-left text-[11px] font-bold text-ocean-700 underline decoration-ocean-300 underline-offset-2"
          >
            ← Back to quick actions
          </button>
        )}
      </div>

      <p
        className={`text-center text-[9px] font-semibold uppercase tracking-wide text-white/90 max-sm:text-ocean-800 sm:text-xs sm:tracking-wider ${showMobileFields ? "max-sm:block" : "max-sm:hidden"} sm:block`}
      >
        Tell us you&apos;re in — we call back in ~60 sec
      </p>
      <p
        className={`mt-1 text-center text-[10px] font-medium leading-snug text-ocean-700 max-sm:text-ocean-700 sm:mt-2 sm:text-xs sm:text-white/90 ${showMobileFields ? "max-sm:block" : "max-sm:hidden"} sm:block`}
      >
        <span className="sm:hidden">
          Morning North Goa slots move fast — drop your number and we&apos;ll help you lock a
          date.
        </span>
        <span className="hidden sm:inline">
          Drop your number — we&apos;ll help you lock a morning slot before it&apos;s gone.
        </span>
      </p>
      <form
        onSubmit={submit}
        className={`mt-1 grid grid-cols-2 gap-x-1.5 gap-y-1 sm:mt-4 sm:flex sm:flex-col sm:gap-3 ${showMobileFields ? "max-sm:grid" : "max-sm:hidden"}`}
      >
        <label className="col-span-2 block text-[9px] font-medium leading-tight text-white/90 max-sm:text-ocean-800 sm:text-xs">
          Phone <span className="text-cyan-200 max-sm:text-cyan-600">*</span>
          <input
            ref={phoneInputRef}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            className={inputClass}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Mobile"
          />
        </label>
        <label className="block min-w-0 text-[9px] font-medium leading-tight text-white/90 max-sm:text-ocean-800 sm:col-span-2 sm:text-xs">
          Name
          <input
            type="text"
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="—"
            maxLength={80}
          />
        </label>
        <label className="block min-w-0 text-[9px] font-medium leading-tight text-white/90 max-sm:text-ocean-800 sm:col-span-2 sm:text-xs">
          <span className="max-sm:hidden">Preferred </span>date
          <input
            type="date"
            className={`${inputClass} [color-scheme:dark] max-sm:[color-scheme:light] max-sm:pr-0`}
            value={preferredDate}
            onChange={(e) => setPreferredDate(e.target.value)}
          />
        </label>
        <label className="col-span-2 block text-[9px] font-medium leading-tight text-white/90 max-sm:text-ocean-800 sm:text-xs">
          <span className="max-sm:hidden">Interested in</span>
          <span className="sm:hidden">Package</span>
          <select
            className={`${inputClass} text-white`}
            value={interestedItem}
            onChange={(e) => setInterestedItem(e.target.value)}
            disabled={loading}
          >
            <option value="" className="bg-ocean-900 text-white">
              {loading ? "Loading…" : "Package (optional)"}
            </option>
            {packages.map((p) => (
              <option key={p.id} value={p.name} className="bg-ocean-900 text-white">
                {p.name}
              </option>
            ))}
          </select>
        </label>
        {msg ? (
          <p
            className="col-span-2 text-center text-[9px] leading-tight text-cyan-100 max-sm:text-ocean-700 sm:text-xs"
            role="status"
          >
            {msg}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          className="col-span-2 min-h-10 w-full touch-manipulation rounded-full bg-ocean-900 py-2 text-[10px] font-extrabold text-white shadow-lg shadow-ocean-950/40 ring-2 ring-cyan-400/50 transition hover:bg-ocean-800 active:brightness-95 disabled:opacity-50 max-sm:uppercase sm:min-h-11 sm:bg-cyan-500 sm:py-3 sm:font-bold sm:text-slate-950 sm:shadow-cyan-500/30 sm:ring-cyan-300/60 sm:hover:bg-cyan-400"
        >
          {busy ? (
            <>
              <span className="sm:hidden">Wait…</span>
              <span className="hidden sm:inline">Sending…</span>
            </>
          ) : (
            <>
              <span className="sm:hidden">Send — call me back</span>
              <span className="hidden sm:inline">Call me back — I want to book</span>
            </>
          )}
        </button>
      </form>
      <div
        className={`mt-1 flex gap-1 sm:mt-4 sm:gap-3 ${showMobileFields ? "max-sm:flex" : "max-sm:hidden"} sm:flex`}
      >
        <Link href="/booking" className={bookSlotBtnClass}>
          <span className="sm:hidden">Book slot</span>
          <span className="hidden sm:inline">Secure my slot</span>
        </Link>
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className={whatsappSolidClass}
        >
          WhatsApp
        </a>
      </div>
    </div>
  );
}

export function HeroSection() {
  const { slides } = useHeroSlides();
  const { packages, loading: packagesLoading } = usePackages();
  const fromPriceInr = useMemo(
    () => lowestListedPackageInr(packages),
    [packages],
  );
  const [i, setI] = useState(0);
  const n = slides.length;
  const [heroAudibleSpent, setHeroAudibleSpent] = useState(false);
  const markHeroAudibleConsumed = useCallback(() => {
    setHeroAudibleSpent(true);
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

  const currentHasVideo = Boolean(slides[i]?.videoUrl?.trim());

  useEffect(() => {
    if (n <= 1) return;
    if (currentHasVideo) return;
    const t = window.setInterval(() => advanceSlide(), 5500);
    return () => window.clearInterval(t);
  }, [n, i, advanceSlide, currentHasVideo]);

  const current = slides[i] ?? slides[0];
  const slideKey = current
    ? `${current.videoUrl ?? ""}|${current.src}|${i}`
    : "hero-empty";

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
                heroAudibleSpent={heroAudibleSpent}
                onHeroAudibleConsumed={markHeroAudibleConsumed}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
        <div className="absolute inset-0 bg-hero-overlay" />
      </div>

      {/* Mobile: keep hero image clean — no text on photo (CTAs: sticky bar + form + trust strip) */}
      <h1 className="sr-only">
        Book Scuba Goa — scuba diving, tours &amp; water sports in North Goa.
        {fromPriceInr != null
          ? ` Packages from ₹${fromPriceInr.toLocaleString("en-IN")}.`
          : ""}{" "}
        Pay online with Razorpay; WhatsApp confirmation.
      </h1>
      {/* Desktop / tablet: conversion copy over hero */}
      <div className="pointer-events-none absolute inset-x-0 top-[5.25rem] z-[16] hidden justify-center px-3 sm:flex sm:inset-x-auto sm:left-0 sm:top-1/2 sm:w-full sm:-translate-y-[52%] sm:justify-start sm:px-6 sm:pl-8 lg:pl-12">
        <div className="pointer-events-auto w-full max-w-md text-center sm:max-w-lg sm:text-left lg:max-w-xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300 sm:text-xs sm:tracking-[0.22em]">
            Limited morning slots · North Goa
          </p>
          <h2 className="mt-1 font-display text-lg font-bold leading-snug tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)] sm:mt-2 sm:text-3xl sm:leading-tight md:text-4xl lg:text-[2.65rem] lg:leading-[1.12]">
            <span className="block sm:inline">Make this the trip you actually</span>{" "}
            <span className="block sm:inline">breathed underwater</span>
          </h2>
          {fromPriceInr != null ? (
            <p className="mt-2 font-display text-2xl font-bold tabular-nums tracking-tight text-cyan-200 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] sm:mt-3 sm:text-3xl md:text-4xl">
              From ₹{fromPriceInr.toLocaleString("en-IN")}
              <span className="mt-0.5 block font-sans text-[10px] font-semibold uppercase tracking-wider text-white/85 sm:text-xs">
                Live site price · not a teaser rate
              </span>
            </p>
          ) : packagesLoading ? (
            <p className="mt-2 text-xs font-medium text-white/75 sm:mt-3 sm:text-sm">
              Loading live prices…
            </p>
          ) : null}
          <p className="mt-1.5 text-xs font-medium leading-snug text-white/95 drop-shadow sm:mt-3 sm:text-base sm:leading-relaxed md:text-lg">
            ₹199 advance or full pay · Razorpay · WhatsApp confirm — turn &quot;someday&quot;
            into a real slot on the boat.
          </p>
          <p className="mt-1 inline-flex rounded-full border border-red-300/60 bg-red-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-red-100 sm:mt-2 sm:text-xs">
            Today only: weekend slots go first
          </p>
          <div className="mt-2.5 flex flex-wrap justify-center gap-2 sm:mt-6 sm:justify-start sm:gap-3">
            <Link
              href="/booking"
              className="inline-flex min-h-11 min-w-[44px] touch-manipulation items-center justify-center rounded-full bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-cyan-900/35 transition hover:bg-cyan-400 sm:px-6 sm:text-sm"
            >
              Secure my dive &amp; pay
            </Link>
            <a
              href={whatsappLink(
                "Hi — I want to book from your website today. What slots do you have?"
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 min-w-[44px] touch-manipulation items-center justify-center rounded-full border-2 border-white/75 bg-white/12 px-4 py-2 text-xs font-bold text-white backdrop-blur-sm transition hover:bg-white/22 sm:px-6 sm:text-sm"
            >
              WhatsApp — I want today / tomorrow
            </a>
          </div>
        </div>
      </div>

      {/* Mobile: ~40% of form on hero, ~60% below hero (above urgency strip); bottom-aligned then translateY(60% of card height) */}
      <div className="pointer-events-none absolute inset-0 z-20 flex w-full items-end justify-center px-[14px] pb-0 sm:hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45 }}
          className="pointer-events-auto relative z-30 w-full min-w-0 max-w-none"
        >
          <div className="w-full min-w-0 translate-y-[60%]">
            <HeroQuickBookingPanel
              packages={packages}
              loading={packagesLoading}
              fromPriceInr={fromPriceInr}
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
          <HeroQuickBookingPanel
            packages={packages}
            loading={packagesLoading}
            fromPriceInr={fromPriceInr}
          />
        </motion.div>
      </div>
    </section>
  );
}
