"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MISSED_CALL_DISPLAY_LABEL,
  MISSED_CALL_TEL_HREF,
  whatsappLink,
} from "@/lib/constants";
import { BSG_OPEN_OFFER_EVENT } from "@/lib/lead-offer-events";
import { trackMetaWhatsAppClick } from "@/lib/meta-pixel";
import {
  hasVisitedNonHome,
  isHomePath,
  markVisitedNonHome,
} from "@/lib/visit-session";
import { getOrCreateAnalyticsSessionId } from "@/lib/analytics-client-ids";

const STORAGE_KEY = "bsg_offer_popup_v1";

/**
 * Delay before the side teaser tab fades in on the homepage. Kept long enough
 * that it never competes with the hero, but short enough that an engaged
 * visitor can still discover the offer voluntarily.
 */
const TEASER_DELAY_MS = 10000;

/**
 * Delay before the offer modal auto-opens on the homepage. Only ever runs for
 * *returning* visitors (those who already viewed another page in this session),
 * so a fresh landing on `/` never gets interrupted.
 */
const RETURNING_AUTO_OPEN_DELAY_MS = 12000;

function readPopupState(): "fresh" | "dismissed" | "submitted" {
  if (typeof window === "undefined") return "fresh";
  try {
    const v = sessionStorage.getItem(STORAGE_KEY);
    if (v === "dismissed" || v === "submitted") return v;
  } catch {
    /* ignore */
  }
  return "fresh";
}

function writePopupState(v: "dismissed" | "submitted") {
  try {
    sessionStorage.setItem(STORAGE_KEY, v);
  } catch {
    /* ignore */
  }
}

export function LeadOfferPopup() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") ?? false;
  const isHome = isHomePath(pathname);
  const returnedHome = hasVisitedNonHome();

  const [open, setOpen] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const openedRef = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastFocusRef = useRef<HTMLElement | null>(null);

  /**
   * Auto-open + teaser are only allowed when:
   *  - we are on the homepage,
   *  - the user has not already dismissed or submitted in this session.
   * The modal further requires the user to have visited another page already
   * (i.e. they are *returning* to home), so brand-new visitors are never
   * interrupted by a payment-flavored prompt on first paint.
   */
  /** No teaser or auto modal until the user has browsed away from home and come back. */
  const canInteract =
    !isAdmin &&
    isHome &&
    returnedHome &&
    readPopupState() === "fresh";

  const tryOpen = useCallback(() => {
    if (isAdmin || openedRef.current) return;
    if (!isHome || !returnedHome) return;
    if (readPopupState() !== "fresh") return;
    openedRef.current = true;
    setOpen(true);
    setShowTeaser(false);
  }, [isAdmin, isHome, returnedHome]);

  // Remember when the visitor leaves the homepage. The next time they come
  // back to `/`, they qualify for the auto-open behavior.
  useEffect(() => {
    if (isAdmin) return;
    if (pathname && !isHomePath(pathname)) {
      markVisitedNonHome();
    }
  }, [pathname, isAdmin]);

  // Side teaser tab — homepage only, gentle delay so it never competes with
  // the hero on first paint.
  useEffect(() => {
    if (!canInteract) return;
    const t = window.setTimeout(() => {
      if (readPopupState() === "fresh") setShowTeaser(true);
    }, TEASER_DELAY_MS);
    return () => clearTimeout(t);
  }, [canInteract]);

  // Auto-open the modal ONLY for returning visitors on the homepage, after
  // a comfortable dwell. First-time landers and every other page get nothing.
  useEffect(() => {
    if (!canInteract) return;
    const t = window.setTimeout(tryOpen, RETURNING_AUTO_OPEN_DELAY_MS);
    return () => clearTimeout(t);
  }, [canInteract, tryOpen]);

  // Manual trigger from anywhere on the site (e.g. a "Get ₹200 off" button).
  // We still respect the dismissed/submitted state, but allow it on any page
  // because it is an explicit user action.
  useEffect(() => {
    if (isAdmin) return;
    const onCustom = () => {
      if (readPopupState() !== "fresh") return;
      openedRef.current = true;
      setOpen(true);
      setShowTeaser(false);
    };
    window.addEventListener(BSG_OPEN_OFFER_EVENT, onCustom);
    return () => window.removeEventListener(BSG_OPEN_OFFER_EVENT, onCustom);
  }, [isAdmin]);

  // Reset transient UI when the user navigates away from the homepage —
  // the teaser tab and any auto-arming should not linger on /booking etc.
  useEffect(() => {
    if (!isHome) {
      setShowTeaser(false);
      setOpen(false);
      openedRef.current = false;
    }
  }, [isHome]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    lastFocusRef.current = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => {
      dialogRef.current?.querySelector<HTMLInputElement>("input[type=tel]")?.focus();
    }, 100);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        openedRef.current = true;
        setOpen(false);
        writePopupState("dismissed");
        lastFocusRef.current?.focus?.();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    let digits = phone.replace(/\D/g, "");
    if (digits.length >= 12 && digits.startsWith("91")) {
      digits = digits.slice(-10);
    }
    if (digits.length === 11 && digits.startsWith("0")) {
      digits = digits.slice(1);
    }
    if (digits.length !== 10) {
      setMsg("Enter a valid 10-digit Indian mobile (optional +91).");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/marketing/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "",
          phone: `91${digits}`,
          interestedItem: "₹200 OFF — WhatsApp offer (popup)",
          preferredDate: "",
          source: "offer_popup_200",
          sessionId: getOrCreateAnalyticsSessionId(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error ?? "Could not save. Try WhatsApp below.");
        return;
      }
      writePopupState("submitted");
      setOpen(false);
      setShowTeaser(false);
      const wa = whatsappLink(
        `Hi Book Scuba Goa — I want the ₹200 website discount. My WhatsApp number: +91 ${digits.slice(0, 5)} ${digits.slice(5)}.`
      );
      trackMetaWhatsAppClick();
      window.open(wa, "_blank", "noopener,noreferrer");
    } catch {
      setMsg("Something went wrong. Use WhatsApp below.");
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    setOpen(false);
    writePopupState("dismissed");
    setShowTeaser(false);
  }

  if (isAdmin) return null;

  return (
    <>
      {canInteract && showTeaser && !open ? (
        <button
          type="button"
          className="fixed left-0 top-[40%] z-[55] hidden max-w-[2.75rem] touch-manipulation rounded-r-xl border border-amber-300/90 bg-gradient-to-b from-amber-400 to-amber-500 px-1.5 py-4 text-center text-[10px] font-extrabold uppercase leading-tight tracking-wide text-amber-950 shadow-lg shadow-amber-900/20 md:top-[42%] md:block"
          style={{ writingMode: "vertical-rl" }}
          aria-label="Get 200 rupees off — open offer"
          onClick={() => {
            openedRef.current = true;
            setOpen(true);
            setShowTeaser(false);
          }}
        >
          ₹200 OFF
        </button>
      ) : null}

      {open ? (
          <div
            role="presentation"
            className="fixed inset-0 z-[90] bg-slate-950/70 backdrop-blur-sm"
            onClick={dismiss}
          />
        ) : null}

      {open ? (
          <div
            className="pointer-events-none fixed inset-0 z-[91] flex items-end justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0.75rem))] pt-12 sm:items-center sm:py-6"
          >
            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="offer-popup-title"
              // Mobile: capped at 20 rem wide and 78 dvh tall so it never feels
              // like the popup has swallowed the screen. Desktop keeps the
              // original roomier sizing.
              className="pointer-events-auto relative w-full max-w-[min(calc(100vw-1.5rem),20rem)] max-h-[78dvh] overflow-x-hidden overflow-y-auto overscroll-contain rounded-2xl border border-amber-200/90 bg-white px-4 pb-4 pt-3 shadow-2xl shadow-amber-900/15 sm:max-w-md sm:max-h-[min(90dvh,36rem)] sm:p-5 sm:pt-4"
              onClick={(e) => e.stopPropagation()}
            >
            <button
              type="button"
              // 44 × 44 minimum tap target (was 36 × 36 — failed WCAG 2.5.5).
              className="absolute right-1.5 top-1.5 z-10 inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-full text-base text-ocean-700 transition hover:bg-ocean-50 hover:text-ocean-900 active:bg-ocean-100 sm:right-3 sm:top-3"
              aria-label="Close offer"
              onClick={dismiss}
            >
              ✕
            </button>
            <p className="pr-10 text-center text-[11px] font-bold uppercase tracking-wider text-amber-700">
              Limited-time
            </p>
            <h2
              id="offer-popup-title"
              className="mt-0.5 pr-10 text-center font-display text-lg font-bold text-ocean-900 sm:text-xl"
            >
              Get ₹200 OFF
            </h2>
            <p className="mt-1.5 text-center text-[13px] leading-snug text-ocean-800 sm:text-sm">
              Book online with secure card or UPI (Razorpay) — the ₹200 website offer applies at
              checkout.
            </p>
            <Link
              href="/booking"
              className="mt-3 flex min-h-12 w-full items-center justify-center rounded-full bg-ocean-gradient px-4 py-3 text-center text-sm font-extrabold text-white shadow-md transition hover:opacity-95 active:opacity-90"
              onClick={() => {
                setOpen(false);
                setShowTeaser(false);
              }}
            >
              Claim ₹200 off — book now
            </Link>
            <div className="mt-4 border-t border-ocean-100 pt-3">
              <p className="text-center text-xs font-semibold text-ocean-900">
                Prefer WhatsApp? Get the code here
              </p>
              <p className="mt-0.5 text-center text-[11px] text-ocean-700">
                We&apos;ll save your number and open WhatsApp with a prefilled message.
              </p>
              <form onSubmit={submit} className="mt-2.5 space-y-2.5">
                <label className="block text-xs font-semibold text-ocean-900">
                  WhatsApp number
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit mobile"
                    className="mt-1 w-full rounded-xl border border-ocean-300 px-3 py-3 text-base text-ocean-900 placeholder:text-ocean-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 sm:text-sm"
                  />
                </label>
                {msg ? (
                  <p className="text-center text-sm text-red-600" role="status">
                    {msg}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={busy}
                  className="flex min-h-12 w-full touch-manipulation items-center justify-center rounded-full border-2 border-ocean-300 bg-ocean-50 py-3 text-sm font-bold text-ocean-900 transition hover:border-ocean-400 hover:bg-white active:opacity-90 disabled:opacity-50"
                >
                  {busy ? "Sending…" : "Send my ₹200 code on WhatsApp"}
                </button>
              </form>
            </div>
            <div className="mt-3 border-t border-ocean-100 pt-3">
              <p className="text-center text-[11px] font-semibold text-ocean-800">
                Or missed call — we WhatsApp you back
              </p>
              <a
                href={MISSED_CALL_TEL_HREF}
                className="mt-1.5 flex min-h-12 w-full touch-manipulation items-center justify-center break-all rounded-full border-2 border-ocean-300 bg-ocean-50 px-3 py-2.5 text-center text-[13px] font-bold leading-snug text-ocean-900 transition hover:border-ocean-400 hover:bg-white active:opacity-90 sm:text-sm"
              >
                {MISSED_CALL_DISPLAY_LABEL}
              </a>
              <p className="mt-1.5 text-center text-[10px] text-ocean-700">
                Ring once and hang up. Standard call rates may apply.
              </p>
            </div>
            </div>
          </div>
        ) : null}
    </>
  );
}
