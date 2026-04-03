"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { usePathname } from "next/navigation";
import {
  MISSED_CALL_DISPLAY_LABEL,
  MISSED_CALL_TEL_HREF,
  whatsappLink,
} from "@/lib/constants";
import { BSG_OPEN_OFFER_EVENT } from "@/lib/lead-offer-events";

const STORAGE_KEY = "bsg_offer_popup_v1";
const LEAD_SID_KEY = "bsg_marketing_sid";

const MIN_MS_BEFORE_AUTO = 6500;
const TIMER_MS = 22000;
const SCROLL_THRESHOLD = 0.32;
const EXIT_INTENT_MIN_MS = 12000;

function getMarketingSessionId(): string {
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

  const [open, setOpen] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const openedRef = useRef(false);
  const mountAt = useRef(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastFocusRef = useRef<HTMLElement | null>(null);

  const canInteract = !isAdmin && readPopupState() === "fresh";

  const tryOpen = useCallback(() => {
    if (isAdmin || openedRef.current) return;
    if (readPopupState() !== "fresh") return;
    const elapsed = Date.now() - mountAt.current;
    if (elapsed < MIN_MS_BEFORE_AUTO) return;
    openedRef.current = true;
    setOpen(true);
    setShowTeaser(false);
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin || !canInteract) return;
    mountAt.current = Date.now();
  }, [isAdmin, canInteract]);

  useEffect(() => {
    if (isAdmin || !canInteract) return;
    const t = window.setTimeout(() => {
      if (readPopupState() === "fresh") setShowTeaser(true);
    }, MIN_MS_BEFORE_AUTO);
    return () => clearTimeout(t);
  }, [isAdmin, canInteract]);

  useEffect(() => {
    if (isAdmin || !canInteract) return;
    const t = window.setTimeout(tryOpen, TIMER_MS);
    return () => clearTimeout(t);
  }, [isAdmin, canInteract, tryOpen]);

  useEffect(() => {
    if (isAdmin || !canInteract) return;
    const onScroll = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const pct = window.scrollY / scrollable;
      if (pct >= SCROLL_THRESHOLD) tryOpen();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isAdmin, canInteract, tryOpen]);

  useEffect(() => {
    if (isAdmin || !canInteract || typeof window === "undefined") return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const onLeave = (e: MouseEvent) => {
      if (readPopupState() !== "fresh" || openedRef.current) return;
      if (Date.now() - mountAt.current < EXIT_INTENT_MIN_MS) return;
      if (e.clientY > 24) return;
      tryOpen();
    };
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => document.documentElement.removeEventListener("mouseleave", onLeave);
  }, [isAdmin, canInteract, tryOpen]);

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
          sessionId: getMarketingSessionId(),
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
      <AnimatePresence>
        {canInteract && showTeaser && !open ? (
          <motion.button
            key="teaser"
            type="button"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.25 }}
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
          </motion.button>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {open ? (
          <motion.div
            key="backdrop"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-slate-950/70 backdrop-blur-sm"
            onClick={dismiss}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {open ? (
          <motion.div
            key="dialog-portal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[91] flex items-end justify-center p-3 pt-10 pb-[max(0.75rem,env(safe-area-inset-bottom,0.75rem))] pointer-events-none sm:items-center sm:py-6"
          >
            <motion.div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="offer-popup-title"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              className="pointer-events-auto relative w-full max-w-[min(100%,22rem)] max-h-[min(88dvh,calc(100dvh-2.5rem))] overflow-x-hidden overflow-y-auto overscroll-contain rounded-2xl border border-amber-200/90 bg-white px-4 pb-4 pt-3 shadow-2xl shadow-amber-900/15 sm:max-h-[min(90dvh,36rem)] sm:p-5 sm:pt-4"
              onClick={(e) => e.stopPropagation()}
            >
            <button
              type="button"
              className="absolute right-2 top-2 z-10 min-h-9 min-w-9 touch-manipulation rounded-full p-2 text-ocean-500 transition hover:bg-ocean-50 hover:text-ocean-800 sm:right-3 sm:top-3"
              aria-label="Close"
              onClick={dismiss}
            >
              ✕
            </button>
            <p className="text-center text-xs font-bold uppercase tracking-wider text-amber-700">
              Limited-time
            </p>
            <h2
              id="offer-popup-title"
              className="mt-1 text-center font-display text-xl font-bold text-ocean-900"
            >
              Get ₹200 OFF
            </h2>
            <p className="mt-2 text-center text-sm text-ocean-700">
              You&apos;re seconds from ₹200 off — we&apos;ll drop the code in WhatsApp so you
              can book with confidence.
            </p>
            <form onSubmit={submit} className="mt-4 space-y-3">
              <label className="block text-xs font-medium text-ocean-800">
                WhatsApp number
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit mobile"
                  className="mt-1 w-full rounded-xl border border-ocean-200 px-3 py-2.5 text-ocean-900 placeholder:text-ocean-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
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
                className="w-full rounded-full bg-ocean-gradient py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-95 disabled:opacity-50"
              >
                {busy ? "Sending…" : "Send my ₹200 code on WhatsApp"}
              </button>
            </form>
            <div className="mt-4 border-t border-ocean-100 pt-4">
              <p className="text-center text-[11px] font-semibold text-ocean-600">
                Or missed call — we WhatsApp you back
              </p>
              <a
                href={MISSED_CALL_TEL_HREF}
                className="mt-2 flex min-h-11 w-full items-center justify-center break-all rounded-full border-2 border-ocean-200 bg-ocean-50 px-3 py-2.5 text-center text-xs font-semibold leading-snug text-ocean-800 transition hover:border-ocean-300 hover:bg-white sm:text-sm"
              >
                {MISSED_CALL_DISPLAY_LABEL}
              </a>
              <p className="mt-2 text-center text-[10px] text-ocean-500">
                Ring once and hang up. Standard call rates may apply.
              </p>
            </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
