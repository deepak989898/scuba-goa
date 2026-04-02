"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, type FormEvent } from "react";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import { useHeroSlides } from "@/hooks/useHeroSlides";
import { usePackages } from "@/hooks/usePackages";
import { whatsappLink } from "@/lib/constants";

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

function HeroQuickBookingPanel() {
  const { packages, loading } = usePackages();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [interestedItem, setInterestedItem] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

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
    "mt-0.5 w-full rounded-lg border px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 sm:mt-1 sm:rounded-xl sm:px-3 sm:py-2 sm:text-sm border-white/25 bg-white/10 text-white placeholder:text-white/50 focus:border-cyan-300/80 focus:ring-cyan-300/60 max-sm:border-ocean-200 max-sm:bg-white max-sm:text-ocean-900 max-sm:placeholder:text-ocean-400 max-sm:focus:border-ocean-500 max-sm:focus:ring-ocean-400";

  return (
    <div className="rounded-xl border border-white/20 bg-white/10 p-2 shadow-lg backdrop-blur-md u-hero-3d max-sm:border-ocean-200/90 max-sm:bg-white/95 max-sm:shadow-2xl sm:rounded-3xl sm:p-5 sm:shadow-none">
      <p className="text-center text-[10px] font-semibold uppercase tracking-wider text-white/90 max-sm:text-ocean-800 sm:text-xs">
        Quick booking
      </p>
      <form
        onSubmit={submit}
        className="mt-2 space-y-1.5 sm:mt-4 sm:space-y-3"
      >
        <label className="block text-[10px] font-medium text-white/90 max-sm:text-ocean-800 sm:text-xs">
          Phone <span className="text-cyan-200 max-sm:text-cyan-600">*</span>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            className={inputClass}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Mobile number"
          />
        </label>
        <label className="block text-[10px] font-medium text-white/90 max-sm:text-ocean-800 sm:text-xs">
          Name
          <input
            type="text"
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Optional"
            maxLength={80}
          />
        </label>
        <label className="block text-[10px] font-medium text-white/90 max-sm:text-ocean-800 sm:text-xs">
          Preferred date
          <input
            type="date"
            className={`${inputClass} [color-scheme:dark] max-sm:[color-scheme:light]`}
            value={preferredDate}
            onChange={(e) => setPreferredDate(e.target.value)}
          />
        </label>
        <label className="block text-[10px] font-medium text-white/90 max-sm:text-ocean-800 sm:text-xs">
          Interested in
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
            className="text-center text-[10px] leading-snug text-cyan-100 max-sm:text-ocean-700 sm:text-xs"
            role="status"
          >
            {msg}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-cyan-500 py-2 text-[11px] font-semibold text-slate-950 shadow-md shadow-cyan-500/25 transition hover:bg-cyan-400 disabled:opacity-50 sm:py-3 sm:text-sm"
        >
          {busy ? "Sending…" : "Request callback"}
        </button>
      </form>
      <div className="mt-2 flex flex-wrap gap-1.5 sm:mt-4 sm:gap-3">
        <Link
          href="/booking"
          className="inline-flex min-h-9 min-w-0 flex-1 items-center justify-center rounded-full bg-white px-2 py-1.5 text-[10px] font-semibold text-ocean-800 shadow-md transition hover:bg-ocean-50 sm:min-h-11 sm:flex-none sm:px-5 sm:py-2.5 sm:text-sm"
        >
          Book Now
        </Link>
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-9 min-w-0 flex-1 items-center justify-center rounded-full border-2 border-white/80 bg-white/10 px-2 py-1.5 text-[10px] font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 max-sm:border-ocean-300 max-sm:bg-ocean-50 max-sm:text-ocean-800 max-sm:hover:bg-ocean-100 sm:min-h-11 sm:flex-none sm:px-5 sm:py-2.5 sm:text-sm"
        >
          WhatsApp
        </a>
      </div>
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

  return (
    <section className="relative isolate -mt-20 overflow-visible bg-ocean-900 pt-20 max-sm:z-20 max-sm:min-h-[min(50dvh,400px)] sm:z-auto sm:-mt-[5.25rem] sm:min-h-[88vh] sm:overflow-hidden sm:pt-[5.25rem]">
      {/* Clip slides to hero box only; section can overflow on mobile for straddle card */}
      <div className="absolute inset-0 overflow-hidden">
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

      {/* Mobile: ~40% of form on hero, ~60% below hero (above urgency strip); bottom-aligned then translateY(60% of card height) */}
      <div className="pointer-events-none absolute inset-0 z-20 flex items-end justify-center px-3 pb-0 sm:hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45 }}
          className="pointer-events-auto relative z-30 w-full max-w-[min(20rem,calc(100vw-1.25rem))]"
        >
          <div className="translate-y-[60%]">
            <HeroQuickBookingPanel />
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
          <HeroQuickBookingPanel />
        </motion.div>
      </div>
    </section>
  );
}
