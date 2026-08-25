"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { whatsappLink } from "@/lib/constants";
import { ChatMessageBody } from "@/components/ChatMessageBody";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import { ASK_PACKAGES_TOGGLE_EVENT } from "@/components/WhatsAppFloat";
import { useServices } from "@/hooks/useServices";
import { useCart } from "@/context/CartContext";
import type { ServiceItem, SubServiceItem } from "@/data/services";
import {
  encodeServiceBaseOption,
  encodeServiceSubOption,
} from "@/lib/booking-selection";
import { buildHeroBookingHref } from "@/lib/hero-slide-booking";
import {
  getPricedSubServicesWithIndex,
  getSubServiceCartKey,
} from "@/lib/service-sub-helpers";

const STORAGE_KEY = "bookscuba_ai_lang";

type Lang = { api: string; label: string };

const LANGUAGES: Lang[] = [
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

type CategoryId =
  | "scuba"
  | "casino"
  | "flyboarding"
  | "bungee"
  | "sightseeing"
  | "dudhsagar"
  | "water-sports"
  | "night-club"
  | "others";

const CATEGORIES: { id: CategoryId; label: string; match: RegExp }[] = [
  {
    id: "scuba",
    label: "Scuba diving",
    match: /scuba|diving|grand.?island|paradise.?island/i,
  },
  { id: "casino", label: "Casino", match: /casino/i },
  { id: "flyboarding", label: "Flyboarding", match: /flyboard/i },
  { id: "bungee", label: "Bungee Jumping", match: /bungee/i },
  {
    id: "sightseeing",
    label: "Sight Seen",
    match: /sight|north.?goa|south.?goa|tour|dolphin/i,
  },
  { id: "dudhsagar", label: "Dudhsagar", match: /dudhsagar|waterfall/i },
  { id: "water-sports", label: "Water Sports", match: /water.?sport/i },
  {
    id: "night-club",
    label: "Russian Night Club",
    match: /night.?club|russian|disco|pub/i,
  },
  { id: "others", label: "Others", match: /.*/ },
];

type PickOption = {
  key: string;
  service: ServiceItem;
  sub?: SubServiceItem;
  subIndex?: number;
  title: string;
  price: number;
  image: string;
  short: string;
  includes: string[];
  duration: string;
};

function serviceMatchesCategory(s: ServiceItem, cat: CategoryId): boolean {
  if (cat === "others") {
    return !CATEGORIES.filter((c) => c.id !== "others").some((c) =>
      c.match.test(`${s.slug} ${s.title} ${s.short}`),
    );
  }
  const def = CATEGORIES.find((c) => c.id === cat);
  if (!def) return false;
  return def.match.test(`${s.slug} ${s.title} ${s.short}`);
}

function buildOptionsForCategory(
  services: ServiceItem[],
  cat: CategoryId,
): PickOption[] {
  const matched = services.filter((s) => serviceMatchesCategory(s, cat));
  const out: PickOption[] = [];

  for (const service of matched) {
    const priced = getPricedSubServicesWithIndex(service);
    if (priced.length > 0) {
      for (const { sub, index } of priced) {
        out.push({
          key: `${service.slug}__${getSubServiceCartKey(sub, index)}`,
          service,
          sub,
          subIndex: index,
          title: `${service.title} — ${sub.title}`,
          price: Number(sub.priceFrom),
          image: service.image,
          short: (sub.description || service.short || "").trim(),
          includes: sub.includes?.length
            ? sub.includes
            : service.includes ?? [],
          duration: service.duration,
        });
      }
    } else if (service.priceFrom > 0) {
      out.push({
        key: service.slug,
        service,
        title: service.title,
        price: service.priceFrom,
        image: service.image,
        short: service.short,
        includes: service.includes ?? [],
        duration: service.duration,
      });
    }
  }

  return out;
}

function optionBookingOpt(opt: PickOption): string {
  if (opt.sub && opt.subIndex != null) {
    return encodeServiceSubOption(
      opt.service.slug,
      getSubServiceCartKey(opt.sub, opt.subIndex),
    );
  }
  return encodeServiceBaseOption(opt.service.slug);
}

export function AiChatbot() {
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === "/" || pathname === "";
  const { services, loading: servicesLoading } = useServices();
  const { addService } = useCart();

  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<string>("English");
  const [category, setCategory] = useState<CategoryId | null>(null);
  const [selected, setSelected] = useState<PickOption | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; text: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [bookingBusy, setBookingBusy] = useState(false);

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

  function onLanguageChange(api: string) {
    setLang(api);
    try {
      sessionStorage.setItem(STORAGE_KEY, api);
    } catch {
      /* ignore */
    }
  }

  const options = useMemo(
    () => (category ? buildOptionsForCategory(services, category) : []),
    [services, category],
  );

  function pickCategory(id: CategoryId) {
    setCategory(id);
    setSelected(null);
    setShowChat(false);
    setMessages([]);
  }

  function backToCategories() {
    setCategory(null);
    setSelected(null);
    setShowChat(false);
  }

  function backToOptions() {
    setSelected(null);
    setShowChat(false);
  }

  function bookWithRazorpay(opt: PickOption) {
    setBookingBusy(true);
    try {
      addService({
        slug: opt.service.slug,
        title: opt.sub ? `${opt.service.title} — ${opt.sub.title}` : opt.service.title,
        priceFrom: opt.price,
        subKey:
          opt.sub && opt.subIndex != null
            ? getSubServiceCartKey(opt.sub, opt.subIndex)
            : undefined,
        image: opt.image,
        duration: opt.duration,
        includes: opt.includes,
        rating: opt.service.rating,
        slotsLeft: opt.sub?.slotsLeft ?? opt.service.slotsLeft,
      });
      const href = buildHeroBookingHref(optionBookingOpt(opt));
      setOpen(false);
      router.push(href);
    } finally {
      setBookingBusy(false);
    }
  }

  async function askBot(t: string) {
    if (!t || loading || !lang) return;
    setMessages((m) => [...m, { role: "user", text: t }]);
    setLoading(true);
    try {
      let sessionId = "";
      try {
        sessionId = sessionStorage.getItem("bsg_analytics_sid") ?? "";
      } catch {
        /* ignore */
      }
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: t, language: lang, sessionId }),
      });
      const data = await res.json();
      const reply =
        typeof data.reply === "string"
          ? data.reply
          : "Configure OPENAI_API_KEY for live AI answers. Meanwhile, tap WhatsApp for instant help.";
      setMessages((m) => [...m, { role: "assistant", text: reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text:
            lang === "Hindi"
              ? "AI से कनेक्ट नहीं हो पाया। तुरंत मदद के लिए WhatsApp उपयोग करें।"
              : "Could not reach AI. Use WhatsApp for immediate assistance.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function send() {
    const t = input.trim();
    if (!t || loading) return;
    setInput("");
    setShowChat(true);
    await askBot(t);
  }

  const helpFabBottom =
    "bottom-[calc(6.5rem+0.75rem+env(safe-area-inset-bottom,0px))]";
  const helpPanelBottom =
    "bottom-[calc(6.5rem+0.75rem+3rem+0.5rem+env(safe-area-inset-bottom,0px))]";
  void isHome;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Ask Packages"
        className={`fixed right-4 z-[55] flex h-12 items-center gap-2 whitespace-nowrap rounded-full border border-amber-200/80 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-3 text-xs font-bold text-white shadow-lg shadow-orange-500/40 ring-2 ring-amber-200/60 transition hover:brightness-110 active:brightness-95 sm:px-4 sm:text-sm md:hidden ${helpFabBottom}`}
      >
        Ask Packages
      </button>
      {open ? (
        <div
          className={`fixed right-4 z-[55] flex max-h-[min(85vh,640px)] w-[min(100vw-2.5rem,400px)] flex-col overflow-hidden rounded-2xl border border-ocean-100 bg-white shadow-2xl md:bottom-[13.5rem] md:right-4 ${helpPanelBottom}`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-ocean-100 bg-ocean-50 px-3 py-2.5">
            <p className="shrink-0 text-sm font-semibold text-ocean-900">
              Ask Packages
            </p>
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
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {/* Step 1: categories */}
            {!category ? (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-ocean-900">
                  What do you want?
                </p>
                <p className="text-xs text-ocean-600">
                  Tap a category — then pick a package and book with Razorpay.
                </p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => pickCategory(c.id)}
                      className="min-h-10 touch-manipulation rounded-full border border-ocean-200 bg-ocean-50 px-3.5 py-2 text-sm font-semibold text-ocean-900 hover:border-ocean-400 hover:bg-white"
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Step 2: service / sub options */}
            {category && !selected ? (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={backToCategories}
                  className="text-xs font-semibold text-ocean-700 hover:underline"
                >
                  ← All categories
                </button>
                <p className="text-sm font-semibold text-ocean-900">
                  {CATEGORIES.find((c) => c.id === category)?.label}
                </p>
                {servicesLoading ? (
                  <p className="text-xs text-ocean-500">Loading packages…</p>
                ) : options.length === 0 ? (
                  <p className="rounded-lg border border-ocean-100 bg-ocean-50 px-3 py-2 text-xs text-ocean-700">
                    No live options in this category right now. Try{" "}
                    <button
                      type="button"
                      className="font-semibold underline"
                      onClick={() => pickCategory("others")}
                    >
                      Others
                    </button>{" "}
                    or{" "}
                    <Link href="/services" className="font-semibold underline">
                      browse all services
                    </Link>
                    .
                  </p>
                ) : (
                  <div className="space-y-2">
                    {options.map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setSelected(opt)}
                        className="flex w-full items-center gap-3 rounded-xl border border-ocean-100 bg-white p-2 text-left shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50/40"
                      >
                        <span className="relative h-14 w-16 shrink-0 overflow-hidden rounded-lg bg-ocean-100">
                          {opt.image ? (
                            <CmsRemoteImage
                              src={opt.image}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="64px"
                            />
                          ) : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold leading-snug text-ocean-900">
                            {opt.title}
                          </span>
                          <span className="mt-0.5 block text-xs font-bold text-cyan-800">
                            From ₹{opt.price.toLocaleString("en-IN")}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {/* Step 3: detail card + book */}
            {selected ? (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={backToOptions}
                  className="text-xs font-semibold text-ocean-700 hover:underline"
                >
                  ← Back to options
                </button>
                <article className="overflow-hidden rounded-xl border border-ocean-100 bg-white shadow-sm">
                  <div className="relative aspect-[16/10] bg-ocean-100">
                    {selected.image ? (
                      <CmsRemoteImage
                        src={selected.image}
                        alt={selected.title}
                        fill
                        className="object-cover"
                        sizes="400px"
                        priority
                      />
                    ) : null}
                  </div>
                  <div className="space-y-2 p-3">
                    <h3 className="font-display text-base font-bold text-ocean-900">
                      {selected.title}
                    </h3>
                    <p className="text-lg font-extrabold text-cyan-800">
                      ₹{selected.price.toLocaleString("en-IN")}
                      <span className="ml-1 text-xs font-semibold text-ocean-600">
                        onwards
                      </span>
                    </p>
                    {selected.duration ? (
                      <p className="text-xs text-ocean-600">
                        Duration: {selected.duration}
                      </p>
                    ) : null}
                    {selected.short ? (
                      <p className="text-sm leading-snug text-ocean-800">
                        {selected.short}
                      </p>
                    ) : null}
                    {selected.includes.length > 0 ? (
                      <ul className="flex flex-wrap gap-1.5">
                        {selected.includes.slice(0, 6).map((inc) => (
                          <li
                            key={inc}
                            className="rounded-full bg-ocean-50 px-2 py-0.5 text-[10px] font-medium text-ocean-800"
                          >
                            {inc}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <div className="flex flex-col gap-2 pt-1">
                      <button
                        type="button"
                        disabled={bookingBusy}
                        onClick={() => bookWithRazorpay(selected)}
                        className="min-h-11 w-full touch-manipulation rounded-full bg-ocean-800 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                      >
                        {bookingBusy
                          ? "Opening booking…"
                          : "Book now · Pay with Razorpay"}
                      </button>
                      <Link
                        href={`/services/${selected.service.slug}`}
                        className="inline-flex min-h-10 items-center justify-center rounded-full border border-ocean-200 px-4 py-2 text-sm font-semibold text-ocean-800"
                        onClick={() => setOpen(false)}
                      >
                        See full details
                      </Link>
                      <a
                        href={whatsappLink(
                          `Hi, I want to book: ${selected.title} (₹${selected.price}). Please share slots.`,
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-10 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900"
                      >
                        WhatsApp this package
                      </a>
                    </div>
                  </div>
                </article>
              </div>
            ) : null}

            {/* Optional AI chat (collapsed by default until used) */}
            {showChat || messages.length > 0 ? (
              <div className="mt-4 space-y-2 border-t border-ocean-100 pt-3">
                <p className="text-xs font-semibold text-ocean-700">
                  Or ask a question
                </p>
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={
                      m.role === "user"
                        ? "ml-4 rounded-lg bg-ocean-700 px-3 py-2 text-sm text-white"
                        : "mr-4 rounded-lg bg-ocean-50 px-3 py-2 text-sm text-ocean-900"
                    }
                  >
                    {m.role === "assistant" ? (
                      <ChatMessageBody text={m.text} />
                    ) : (
                      m.text
                    )}
                  </div>
                ))}
                {loading ? (
                  <p className="text-xs text-ocean-500">Thinking…</p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="flex gap-2 border-t border-ocean-100 p-3">
            <input
              className="flex-1 rounded-full border border-ocean-200 px-3 py-2 text-sm"
              placeholder={
                lang === "Hindi" ? "अपना सवाल लिखें…" : "Type a question…"
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void send()}
            />
            <button
              type="button"
              onClick={() => void send()}
              className="min-h-11 touch-manipulation rounded-full bg-ocean-700 px-4 py-3 text-sm font-semibold text-white"
            >
              Send
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
