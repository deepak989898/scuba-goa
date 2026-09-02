"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ASK_PACKAGES_TOGGLE_EVENT } from "@/components/WhatsAppFloat";
import { ChatBookingAgent } from "@/components/chat-booking/ChatBookingAgent";
import { useServices } from "@/hooks/useServices";
import {
  chatAutoOpenAlreadyShown,
  markChatAutoOpenShown,
  msUntilChatAutoOpen,
} from "@/lib/chat-auto-open";

const STORAGE_KEY = "bookscuba_ai_lang";

const LANGUAGES = [
  { api: "English", label: "English" },
  { api: "Hindi", label: "हिन्दी · Hindi" },
  { api: "Telugu", label: "తెలుగు · Telugu" },
  { api: "Marathi", label: "मराठी · Marathi" },
  { api: "Gujarati", label: "ગુજરાતી · Gujarati" },
  { api: "Punjabi", label: "ਪੰਜਾਬੀ · Punjabi" },
  { api: "Tamil", label: "தமிழ் · Tamil" },
  { api: "Kannada", label: "ಕನ್ನಡ · Kannada" },
  { api: "Malayalam", label: "മലയാളം · Malayalam" },
  { api: "Bengali", label: "বাংলা · Bengali" },
  { api: "Odia", label: "ଓଡ଼ିଆ · Odia" },
];

export function AiChatbot() {
  const pathname = usePathname();
  const { services, loading: servicesLoading } = useServices();
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState("English");

  const hydrateLang = useCallback(() => {
    try {
      const s = sessionStorage.getItem(STORAGE_KEY);
      if (s && LANGUAGES.some((l) => l.api === s)) {
        setLang(s);
        return;
      }
    } catch {
      /* ignore */
    }
    setLang("English");
    try {
      sessionStorage.setItem(STORAGE_KEY, "English");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    hydrateLang();
  }, [hydrateLang]);

  useEffect(() => {
    const onToggle = () => setOpen((o) => !o);
    window.addEventListener(ASK_PACKAGES_TOGGLE_EVENT, onToggle);
    return () => window.removeEventListener(ASK_PACKAGES_TOGGLE_EVENT, onToggle);
  }, []);

  useEffect(() => {
    if (chatAutoOpenAlreadyShown()) return;

    const delay = msUntilChatAutoOpen();
    const timer = window.setTimeout(() => {
      if (chatAutoOpenAlreadyShown()) return;
      markChatAutoOpenShown();
      setOpen(true);
    }, delay);

    return () => window.clearTimeout(timer);
  }, []);

  function onLanguageChange(api: string) {
    setLang(api);
    try {
      sessionStorage.setItem(STORAGE_KEY, api);
    } catch {
      /* ignore */
    }
  }

  const helpFabBottom =
    "bottom-[calc(6.5rem+0.75rem+env(safe-area-inset-bottom,0px))]";
  const helpPanelBottom =
    "bottom-[calc(6.5rem+0.75rem+3rem+0.5rem+env(safe-area-inset-bottom,0px))]";
  void pathname;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Book with us"
        className={`fixed right-4 z-[55] flex h-12 items-center gap-2 whitespace-nowrap rounded-full border border-amber-200/80 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-3 text-xs font-bold text-white shadow-lg shadow-orange-500/40 ring-2 ring-amber-200/60 transition hover:brightness-110 active:brightness-95 sm:px-4 sm:text-sm md:hidden ${helpFabBottom}`}
      >
        Book with us
      </button>
      {open ? (
        <div
          className={`fixed right-4 z-[55] flex max-h-[min(85vh,640px)] w-[min(100vw-2.5rem,400px)] flex-col overflow-hidden rounded-2xl border border-ocean-100 bg-white shadow-2xl md:bottom-[13.5rem] md:right-4 ${helpPanelBottom}`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-ocean-100 bg-ocean-50 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ocean-900">
                Book Scuba Goa
              </p>
              <p className="text-[10px] text-ocean-600">
                Tap to book · live prices
              </p>
            </div>
            <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
              <label className="sr-only" htmlFor="ask-packages-lang">
                Language
              </label>
              <select
                id="ask-packages-lang"
                className="max-w-[9.5rem] rounded-lg border border-ocean-200 bg-white px-2 py-1.5 text-xs font-semibold text-ocean-800"
                value={lang}
                onChange={(e) => onLanguageChange(e.target.value)}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.api} value={l.api}>
                    {l.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="text-ocean-700"
                onClick={() => {
                  markChatAutoOpenShown();
                  setOpen(false);
                }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>

          <ChatBookingAgent
            lang={lang}
            services={services}
            servicesLoading={servicesLoading}
          />
        </div>
      ) : null}
    </>
  );
}
