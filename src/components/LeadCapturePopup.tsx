"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { SITE_NAME } from "@/lib/constants";
import { getOrCreateAnalyticsSessionId } from "@/lib/analytics-client-ids";
import {
  dismissLeadPopupForSession,
  hasVisitorLeadSubmitted,
  isLeadPopupDismissedThisSession,
  isLeadPopupShownThisSession,
  markLeadPopupShownThisSession,
  markVisitorLeadSubmitted,
  readVisitorLeadProfile,
  saveVisitorLeadProfile,
} from "@/lib/visitor-lead-profile";

const SHOW_DELAY_MS = 90_000;

function cleanPhoneInput(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 12);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function LeadCapturePopup() {
  const pathname = usePathname() ?? "";
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const shouldSkip =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/booking") ||
    hasVisitorLeadSubmitted() ||
    isLeadPopupDismissedThisSession() ||
    isLeadPopupShownThisSession();

  const tryOpen = useCallback(() => {
    if (
      hasVisitorLeadSubmitted() ||
      isLeadPopupDismissedThisSession() ||
      isLeadPopupShownThisSession()
    ) {
      return;
    }
    markLeadPopupShownThisSession();
    setOpen(true);
  }, []);

  useEffect(() => {
    if (shouldSkip) return;
    const profile = readVisitorLeadProfile();
    setName(profile.name);
    setEmail(profile.email);
    setPhone(profile.phone);

    const timer = window.setTimeout(() => tryOpen(), SHOW_DELAY_MS);

    const onMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) tryOpen();
    };

    const onMouseOut = (e: MouseEvent) => {
      if (e.clientY <= 8 && !e.relatedTarget) tryOpen();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") tryOpen();
    };

    const onPageHide = () => tryOpen();

    document.documentElement.addEventListener("mouseleave", onMouseLeave);
    document.addEventListener("mouseout", onMouseOut);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.clearTimeout(timer);
      document.documentElement.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("mouseout", onMouseOut);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [shouldSkip, pathname, tryOpen]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const dismiss = useCallback(() => {
    dismissLeadPopupForSession();
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismiss]);

  const submit = useCallback(async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const digits = cleanPhoneInput(phone);

    if (!trimmedName) {
      setError("Please enter your name.");
      return;
    }
    if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (digits.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setBusy(true);
    setError(null);

    const profile = {
      name: trimmedName,
      email: trimmedEmail,
      phone: digits,
    };
    saveVisitorLeadProfile(profile);

    try {
      const res = await fetch("/api/marketing/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          phone: digits,
          interestedItem: `Visited ${pathname || "/"}`,
          source: "visitor_popup",
          sessionId: getOrCreateAnalyticsSessionId(),
          capturePath: pathname || "/",
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Could not save — please try again.");
      }
      markVisitorLeadSubmitted();
      setDone(true);
      window.setTimeout(() => setOpen(false), 2200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save — please try again.");
    } finally {
      setBusy(false);
    }
  }, [name, email, phone, pathname]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[95] flex items-end justify-center p-3 sm:items-center sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close dialog backdrop"
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]"
        onClick={dismiss}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[96] w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl shadow-orange-900/20 ring-1 ring-orange-200/60"
      >
        <div className="relative bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 px-5 pb-7 pt-5 text-white">
          <button
            ref={closeRef}
            type="button"
            onClick={dismiss}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg leading-none transition hover:bg-white/30"
            aria-label="Close"
          >
            ×
          </button>
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 ring-2 ring-white/35">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
                <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7L12 17.8l-6.2 4.2 2.3-7-6-4.6h7.4L12 2z" />
              </svg>
            </div>
            <div className="min-w-0 pr-6">
              <h2 id={titleId} className="font-display text-lg font-bold leading-tight sm:text-xl">
                Unlock Goa deals &amp; trip tips
              </h2>
              <p className="mt-1.5 text-sm text-white/95 leading-snug">
                Save your details once — get exclusive offers, package alerts, and
                faster WhatsApp booking from {SITE_NAME}.
              </p>
            </div>
          </div>
          <ul className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold">
            <li className="rounded-full bg-white/20 px-2.5 py-1">Up to 20% off alerts</li>
            <li className="rounded-full bg-white/20 px-2.5 py-1">Priority slot updates</li>
            <li className="rounded-full bg-white/20 px-2.5 py-1">No spam — Goa trips only</li>
          </ul>
        </div>

        <div className="space-y-3 px-5 py-5">
          {done ? (
            <div className="rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50 px-4 py-4 text-center ring-1 ring-teal-200">
              <p className="font-display text-lg font-bold text-teal-900">
                You&apos;re on the list!
              </p>
              <p className="mt-1 text-sm text-teal-800">
                We&apos;ll send you the best Goa offers soon. Happy diving!
              </p>
            </div>
          ) : (
            <>
              <label className="block">
                <span className="text-xs font-semibold text-slate-700">Your name</span>
                <input
                  type="text"
                  name="name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none ring-orange-400/0 transition focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-400/30"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-700">Email</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-400/30"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-700">WhatsApp / mobile</span>
                <input
                  type="tel"
                  name="phone"
                  autoComplete="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(cleanPhoneInput(e.target.value))}
                  placeholder="10-digit mobile number"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-400/30"
                />
              </label>
              {error ? (
                <p className="text-sm font-medium text-red-700">{error}</p>
              ) : null}
              <button
                type="button"
                disabled={busy}
                onClick={() => void submit()}
                className="w-full rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 py-3 text-sm font-extrabold text-white shadow-lg shadow-orange-500/35 transition hover:brightness-105 disabled:opacity-60"
              >
                {busy ? "Saving…" : "Get offers & save my details"}
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="w-full text-center text-xs font-medium text-slate-500 hover:text-slate-700"
              >
                Maybe later
              </button>
              <p className="text-center text-[10px] leading-snug text-slate-500">
                We only use your details for {SITE_NAME} offers and booking support.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
