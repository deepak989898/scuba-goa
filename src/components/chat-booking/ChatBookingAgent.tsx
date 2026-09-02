"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatMessageBody } from "@/components/ChatMessageBody";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import type { ServiceItem } from "@/data/services";
import { getOrCreateAnalyticsSessionId } from "@/lib/analytics-client-ids";
import {
  buildOptionsForCategory,
  CATEGORIES,
  pickOptionToCartLine,
  PICKUP_LOCATIONS,
  type CategoryId,
} from "@/lib/chat-booking-agent/catalog";

function findOptionByKey(
  services: ServiceItem[],
  key: string,
): PickOption | null {
  for (const cat of CATEGORIES) {
    const found = buildOptionsForCategory(services, cat.id).find(
      (o) => o.key === key,
    );
    if (found) return found;
  }
  return null;
}
import {
  pricingSummary,
  runChatBookingCheckout,
} from "@/lib/chat-booking-agent/checkout";
import { t } from "@/lib/chat-booking-agent/i18n";
import { slotSummary } from "@/lib/chat-booking-agent/slots";
import {
  clearBookingState,
  DEFAULT_BOOKING_STATE,
  loadBubbles,
  loadBookingState,
  saveBubbles,
  saveBookingState,
} from "@/lib/chat-booking-agent/storage";
import {
  flushBookWithUsSessionSync,
  scheduleBookWithUsSessionSync,
} from "@/lib/chat-booking-agent/sync-session-log";
import type {
  ChatBubble,
  ChatBookingLine,
  ChatBookingState,
  PickOption,
} from "@/lib/chat-booking-agent/types";

function uid(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function formatDisplayDate(ymd: string): string {
  if (!ymd) return "";
  try {
    const d = new Date(`${ymd}T12:00:00`);
    return d.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    return ymd;
  }
}

function buildDateOptions(): { label: string; value: string }[] {
  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const day2 = new Date(today);
  day2.setDate(day2.getDate() + 2);
  const sat = new Date(today);
  const toSat = (6 - sat.getDay() + 7) % 7 || 7;
  sat.setDate(sat.getDate() + toSat);
  return [
    { label: `Today · ${formatDisplayDate(fmt(today))}`, value: fmt(today) },
    { label: `Tomorrow · ${formatDisplayDate(fmt(tomorrow))}`, value: fmt(tomorrow) },
    { label: formatDisplayDate(fmt(day2)), value: fmt(day2) },
    { label: `Sat · ${formatDisplayDate(fmt(sat))}`, value: fmt(sat) },
  ];
}

type Props = {
  lang: string;
  services: ServiceItem[];
  servicesLoading: boolean;
};

export function ChatBookingAgent({ lang, services, servicesLoading }: Props) {
  const [state, setState] = useState<ChatBookingState>(DEFAULT_BOOKING_STATE);
  const [bubbles, setBubbles] = useState<ChatBubble[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [qaMode, setQaMode] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pickupOther, setPickupOther] = useState(false);
  const [customDate, setCustomDate] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setState(loadBookingState());
    const saved = loadBubbles();
    if (saved.length > 0) {
      setBubbles(saved);
    } else {
      setBubbles([
        {
          id: uid(),
          role: "assistant",
          text: t("welcome", lang),
          at: new Date().toISOString(),
        },
      ]);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveBookingState(state);
  }, [state, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveBubbles(bubbles);
  }, [bubbles, hydrated]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [bubbles, state.step, loading]);

  const pushAssistant = useCallback((text: string) => {
    setBubbles((b) => [
      ...b,
      { id: uid(), role: "assistant", text, at: new Date().toISOString() },
    ]);
  }, []);

  const pushUser = useCallback((text: string) => {
    setBubbles((b) => [
      ...b,
      { id: uid(), role: "user", text, at: new Date().toISOString() },
    ]);
  }, []);

  const goStep = useCallback(
    (next: ChatBookingState["step"], assistantText?: string) => {
      setState((s) => ({ ...s, step: next }));
      if (assistantText) pushAssistant(assistantText);
    },
    [pushAssistant],
  );

  const categoryOptions = useMemo(() => {
    if (!state.categoryId) return [];
    return buildOptionsForCategory(services, state.categoryId as CategoryId);
  }, [services, state.categoryId]);

  const selectedOptions = useMemo(() => {
    return state.selectedKeys
      .map((k) => findOptionByKey(services, k))
      .filter((o): o is PickOption => o != null);
  }, [services, state.selectedKeys]);

  const cartLines = useMemo((): ChatBookingLine[] => {
    if (state.people <= 0) return [];
    return selectedOptions.map((o) => pickOptionToCartLine(o, state.people));
  }, [selectedOptions, state.people]);

  const pricing = useMemo(
    () => pricingSummary(cartLines, state.payMode),
    [cartLines, state.payMode],
  );

  const slots = useMemo(
    () => slotSummary(selectedOptions, state.people),
    [selectedOptions, state.people],
  );

  const buildSyncPayload = useCallback(() => {
    const sessionId = getOrCreateAnalyticsSessionId();
    return {
      sessionId,
      language: lang,
      messages: bubbles.map((b) => ({
        role: b.role,
        text: b.text,
        at: b.at ?? new Date().toISOString(),
        step: state.step,
      })),
      step: state.step,
      tripDate: state.date || undefined,
      people: state.people > 0 ? state.people : undefined,
      pickup: state.pickup || undefined,
      selectedPackages: selectedOptions.map((o) => o.title),
      customerName: state.name.trim() || undefined,
      phone: state.phone.trim() || undefined,
      email: state.email.trim() || undefined,
      cartTotalInr: pricing.fullInr > 0 ? pricing.fullInr : undefined,
      paidInr: state.confirmation?.paidInr,
      converted: state.step === "confirmed" || Boolean(state.confirmation),
      paymentId: state.confirmation?.paymentId,
    };
  }, [bubbles, lang, state, selectedOptions, pricing.fullInr]);

  useEffect(() => {
    if (!hydrated) return;
    scheduleBookWithUsSessionSync(buildSyncPayload());
  }, [hydrated, buildSyncPayload]);

  async function askBot(message: string) {
    if (!message.trim() || loading) return;
    pushUser(message.trim());
    setLoading(true);
    setErr(null);
    try {
      const sessionId = getOrCreateAnalyticsSessionId();
      const bookingContext = {
        step: state.step,
        date: state.date,
        people: state.people,
        pickup: state.pickup,
        selected: selectedOptions.map((o) => o.title),
      };
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          language: lang,
          sessionId,
          bookingContext,
        }),
      });
      const data = await res.json();
      const reply =
        typeof data.reply === "string"
          ? data.reply
          : t("aiFallback", lang);
      pushAssistant(reply);
    } catch {
      pushAssistant(t("aiFallback", lang));
    } finally {
      setLoading(false);
      setInput("");
    }
  }

  function startBooking() {
    setQaMode(false);
    pushUser(t("startBooking", lang));
    goStep("date", t("datePrompt", lang));
  }

  function pickDate(value: string) {
    pushUser(formatDisplayDate(value));
    setState((s) => ({ ...s, date: value, step: "people" }));
    pushAssistant(t("peoplePrompt", lang));
  }

  function pickPeople(n: number) {
    pushUser(String(n));
    setState((s) => ({ ...s, people: n, step: "pickup" }));
    pushAssistant(t("pickupPrompt", lang));
  }

  function pickPickup(loc: string) {
    pushUser(loc);
    setState((s) => ({ ...s, pickup: loc, step: "category" }));
    pushAssistant(t("categoryPrompt", lang));
  }

  function pickCategory(id: CategoryId) {
    const label = CATEGORIES.find((c) => c.id === id)?.label ?? id;
    pushUser(label);
    setState((s) => ({
      ...s,
      categoryId: id,
      step: "packages",
    }));
    pushAssistant(t("packagesPrompt", lang));
  }

  function togglePackage(key: string) {
    setState((s) => {
      const has = s.selectedKeys.includes(key);
      const selectedKeys = has
        ? s.selectedKeys.filter((k) => k !== key)
        : [...s.selectedKeys, key];
      return { ...s, selectedKeys };
    });
  }

  function continueFromPackages() {
    if (state.selectedKeys.length === 0) {
      setErr("Pick at least one package");
      return;
    }
    setErr(null);
    const names = selectedOptions.map((o) => o.title).join(", ");
    pushUser(`${t("continue", lang)} · ${names}`);
    setState((s) => ({ ...s, step: "review" }));
    const slotText = slots.lines.join(" · ");
    pushAssistant(
      `${t("reviewPrompt", lang)}\n\n${slotText}\n\nTotal: ₹${pricing.fullInr.toLocaleString("en-IN")} · Advance: ₹${pricing.minInr.toLocaleString("en-IN")}`,
    );
  }

  function continueToContact() {
    pushUser(t("continue", lang));
    setState((s) => ({ ...s, step: "contact" }));
    pushAssistant(t("contactPrompt", lang));
  }

  function submitContact() {
    const name = state.name.trim();
    const phone = state.phone.trim().replace(/\D/g, "");
    const email = state.email.trim();
    if (!name || phone.length < 10 || !email.includes("@")) {
      setErr("Enter name, 10-digit phone & valid email");
      return;
    }
    setErr(null);
    pushUser(`${name} · ${phone}`);
    setState((s) => ({ ...s, step: "payment", name, phone, email }));
    pushAssistant(
      `${t("paymentPrompt", lang)}\n\nPay ₹${pricing.chargeInr.toLocaleString("en-IN")} now (${state.payMode === "min" ? "advance" : "full"})`,
    );
    void fetch("/api/marketing/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        phone,
        email,
        interestedItem: cartLines.map((l) => l.name).join(", "),
        preferredDate: state.date,
        pickup: state.pickup,
        people: state.people,
        cartTotalInr: pricing.fullInr > 0 ? pricing.fullInr : undefined,
        step: "payment",
        source: "chat_booking",
        sessionId: getOrCreateAnalyticsSessionId(),
      }),
    }).catch(() => {});
  }

  async function payNow() {
    if (cartLines.length === 0) return;
    setBusy(true);
    setErr(null);
    try {
      const result = await runChatBookingCheckout({
        lines: cartLines,
        customerName: state.name.trim(),
        email: state.email.trim(),
        phone: state.phone.trim(),
        date: state.date,
        pickupLocation: state.pickup,
        payMode: state.payMode,
      });
      pushUser(`Paid ₹${result.paidInr.toLocaleString("en-IN")}`);
      const confirmText = `${t("confirmed", lang)}\n\nBooking ID: ${result.paymentId}\nPaid: ₹${result.paidInr.toLocaleString("en-IN")}${
        result.balanceInr > 0
          ? ` · Balance on arrival: ₹${result.balanceInr.toLocaleString("en-IN")}`
          : ""
      }${
        result.emailSent ? "\n✉️ Email sent" : ""
      }${result.smsSent ? "\n📱 SMS/WhatsApp link sent" : ""}`;
      pushAssistant(confirmText);
      setState((s) => ({
        ...s,
        step: "confirmed",
        confirmation: {
          paymentId: result.paymentId,
          paidInr: result.paidInr,
          balanceInr: result.balanceInr,
          fullInr: result.fullInr,
          packageName: result.packageName,
          emailSent: result.emailSent,
          smsSent: result.smsSent,
          invoiceDownloadUrl: result.invoiceDownloadUrl,
        },
      }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Payment failed";
      if (msg !== "Payment cancelled") setErr(msg);
    } finally {
      setBusy(false);
    }
  }

  function newBooking() {
    clearBookingState();
    setState({ ...DEFAULT_BOOKING_STATE });
    setQaMode(false);
    setBubbles([{ id: uid(), role: "assistant", text: t("welcome", lang) }]);
    setErr(null);
  }

  const dateOptions = buildDateOptions();

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3"
      >
        <div className="space-y-2">
          {bubbles.map((m) => (
            <div
              key={m.id}
              className={
                m.role === "user"
                  ? "ml-4 rounded-2xl rounded-br-md bg-gradient-to-r from-cyan-700 to-ocean-800 px-3 py-2 text-sm text-white"
                  : "mr-2 rounded-2xl rounded-bl-md bg-ocean-50 px-3 py-2 text-sm text-ocean-900"
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
            <p className="text-xs text-ocean-500">{t("thinking", lang)}</p>
          ) : null}
        </div>

        {err ? (
          <p className="text-xs text-red-700" role="alert">{err}</p>
        ) : null}

        <div className="space-y-2">
        {/* Welcome */}
        {state.step === "welcome" && !qaMode ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={startBooking}
              className="min-h-10 rounded-full bg-gradient-to-r from-cyan-600 to-ocean-800 px-4 py-2 text-sm font-bold text-white"
            >
              {t("startBooking", lang)}
            </button>
            <button
              type="button"
              onClick={() => {
                setQaMode(true);
                pushAssistant(
                  lang === "Hindi"
                    ? "बताइए — प्राइस, पैकेज या बुकिंग में क्या जानना है?"
                    : "Sure — ask me about prices, packages, or booking. Type below.",
                );
              }}
              className="min-h-10 rounded-full border border-ocean-200 px-4 py-2 text-sm font-semibold text-ocean-800"
            >
              {t("askQuestion", lang)}
            </button>
          </div>
        ) : null}

        {/* Date */}
        {state.step === "date" ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {dateOptions.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => pickDate(d.value)}
                  className="min-h-10 rounded-full border border-ocean-200 bg-ocean-50 px-3 py-2 text-xs font-bold text-ocean-900 hover:border-cyan-400"
                >
                  {d.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="date"
                value={customDate}
                min={dateOptions[0]?.value}
                onChange={(e) => setCustomDate(e.target.value)}
                className="flex-1 rounded-lg border border-ocean-200 px-2 py-2 text-sm"
              />
              <button
                type="button"
                disabled={!customDate}
                onClick={() => pickDate(customDate)}
                className="rounded-full bg-ocean-800 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                OK
              </button>
            </div>
          </div>
        ) : null}

        {/* People */}
        {state.step === "people" ? (
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => pickPeople(n)}
                className="min-h-10 w-12 rounded-full border border-ocean-200 bg-white text-sm font-bold text-ocean-900 hover:border-cyan-500"
              >
                {n}
              </button>
            ))}
          </div>
        ) : null}

        {/* Pickup */}
        {state.step === "pickup" ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {PICKUP_LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => pickPickup(loc)}
                  className="min-h-10 rounded-full border border-ocean-200 bg-ocean-50 px-3 py-2 text-xs font-semibold text-ocean-900"
                >
                  {loc}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPickupOther(true)}
                className="min-h-10 rounded-full border border-dashed border-ocean-300 px-3 py-2 text-xs font-semibold text-ocean-700"
              >
                Other
              </button>
            </div>
            {pickupOther ? (
              <div className="flex gap-2">
                <input
                  placeholder="Hotel / area name"
                  className="flex-1 rounded-lg border border-ocean-200 px-2 py-2 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const v = (e.target as HTMLInputElement).value.trim();
                      if (v) pickPickup(v);
                    }
                  }}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Category */}
        {state.step === "category" ? (
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => pickCategory(c.id)}
                className="min-h-10 rounded-full border border-ocean-200 bg-ocean-50 px-3 py-2 text-xs font-semibold text-ocean-900"
              >
                {c.label}
              </button>
            ))}
          </div>
        ) : null}

        {/* Packages multi-select */}
        {state.step === "packages" ? (
          <div className="space-y-2">
            {servicesLoading ? (
              <p className="text-xs text-ocean-500">Loading…</p>
            ) : categoryOptions.length === 0 ? (
              <p className="text-xs text-ocean-600">
                No options — pick another category.
              </p>
            ) : (
              <div className="max-h-40 space-y-1.5 overflow-y-auto">
                {categoryOptions.map((opt) => {
                  const on = state.selectedKeys.includes(opt.key);
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => togglePackage(opt.key)}
                      className={`flex w-full items-center gap-2 rounded-xl border p-2 text-left text-xs ${
                        on
                          ? "border-cyan-500 bg-cyan-50 ring-1 ring-cyan-300"
                          : "border-ocean-100 bg-white"
                      }`}
                    >
                      <span className="relative h-10 w-12 shrink-0 overflow-hidden rounded-lg bg-ocean-100">
                        {opt.image ? (
                          <CmsRemoteImage
                            src={opt.image}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-ocean-900 line-clamp-2">
                          {opt.title}
                        </span>
                        <span className="font-bold text-cyan-800">
                          ₹{opt.price.toLocaleString("en-IN")}
                          {opt.slotsLeft != null
                            ? ` · ${opt.slotsLeft} slots`
                            : ""}
                        </span>
                      </span>
                      <span
                        className={`text-lg ${on ? "text-cyan-600" : "text-ocean-300"}`}
                      >
                        {on ? "✓" : "+"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            <button
              type="button"
              disabled={state.selectedKeys.length === 0}
              onClick={continueFromPackages}
              className="min-h-11 w-full rounded-full bg-ocean-800 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {t("continue", lang)} ({state.selectedKeys.length} selected)
            </button>
          </div>
        ) : null}

        {/* Review */}
        {state.step === "review" ? (
          <div className="space-y-2 rounded-xl border border-cyan-200 bg-cyan-50/40 p-3 text-xs text-ocean-800">
            <p className="font-semibold text-ocean-900">Your booking summary</p>
            <p>
              📅 {formatDisplayDate(state.date)} · 👥 {state.people} · 📍{" "}
              {state.pickup}
            </p>
            <ul className="space-y-1.5 rounded-lg border border-ocean-100 bg-white p-2">
              {cartLines.map((l) => (
                <li key={l.key} className="flex justify-between gap-2 leading-snug">
                  <span className="min-w-0 break-words">{l.name} ×{l.quantity}</span>
                  <span className="font-bold shrink-0">
                    ₹{l.lineTotal.toLocaleString("en-IN")}
                  </span>
                </li>
              ))}
            </ul>
            <p className="font-bold text-sm">
              Total ₹{pricing.fullInr.toLocaleString("en-IN")} · Min advance ₹
              {pricing.minInr.toLocaleString("en-IN")}
            </p>
            <button
              type="button"
              onClick={continueToContact}
              className="min-h-11 w-full rounded-full bg-gradient-to-r from-cyan-600 to-ocean-800 py-2 text-sm font-bold text-white"
            >
              {t("continue", lang)}
            </button>
            <button
              type="button"
              onClick={() => {
                setState((s) => ({ ...s, step: "category" }));
                pushAssistant(t("categoryPrompt", lang));
              }}
              className="min-h-10 w-full rounded-full border-2 border-amber-400 bg-gradient-to-r from-amber-100 to-orange-100 py-2.5 text-sm font-extrabold text-amber-950 shadow-sm ring-1 ring-amber-300/60 hover:from-amber-200 hover:to-orange-200"
            >
              + Add more activities
            </button>
          </div>
        ) : null}

        {/* Contact */}
        {state.step === "contact" ? (
          <div className="space-y-2">
            <input
              placeholder="Full name"
              value={state.name}
              onChange={(e) =>
                setState((s) => ({ ...s, name: e.target.value }))
              }
              className="w-full rounded-lg border border-ocean-200 px-3 py-2 text-sm"
            />
            <input
              placeholder="Phone (10 digits)"
              type="tel"
              value={state.phone}
              onChange={(e) =>
                setState((s) => ({ ...s, phone: e.target.value }))
              }
              className="w-full rounded-lg border border-ocean-200 px-3 py-2 text-sm"
            />
            <input
              placeholder="Email"
              type="email"
              value={state.email}
              onChange={(e) =>
                setState((s) => ({ ...s, email: e.target.value }))
              }
              className="w-full rounded-lg border border-ocean-200 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={submitContact}
              className="min-h-11 w-full rounded-full bg-ocean-800 py-2 text-sm font-bold text-white"
            >
              {t("continue", lang)}
            </button>
          </div>
        ) : null}

        {/* Payment */}
        {state.step === "payment" ? (
          <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
            <p className="text-xs font-semibold text-ocean-900">
              📅 {formatDisplayDate(state.date)} · 👥 {state.people} · ₹
              {pricing.chargeInr.toLocaleString("en-IN")} to pay now
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setState((s) => ({ ...s, payMode: "min" }))
                }
                className={`flex-1 rounded-full py-2 text-xs font-bold ${
                  state.payMode === "min"
                    ? "bg-cyan-600 text-white"
                    : "border border-ocean-200 text-ocean-800"
                }`}
              >
                {t("payMin", lang)} ₹{pricing.minInr.toLocaleString("en-IN")}
              </button>
              <button
                type="button"
                onClick={() =>
                  setState((s) => ({ ...s, payMode: "full" }))
                }
                className={`flex-1 rounded-full py-2 text-xs font-bold ${
                  state.payMode === "full"
                    ? "bg-cyan-600 text-white"
                    : "border border-ocean-200 text-ocean-800"
                }`}
              >
                {t("payFull", lang)} ₹{pricing.fullInr.toLocaleString("en-IN")}
              </button>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void payNow()}
              className="min-h-12 w-full rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 py-3 text-sm font-extrabold text-white disabled:opacity-50"
            >
              {busy
                ? "Processing…"
                : `Pay ₹${pricing.chargeInr.toLocaleString("en-IN")} · Razorpay`}
            </button>
          </div>
        ) : null}

        {/* Confirmed */}
        {state.step === "confirmed" ? (
          <div className="space-y-2">
            {state.confirmation?.invoiceDownloadUrl ? (
              <a
                href={state.confirmation.invoiceDownloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block min-h-10 rounded-full border border-ocean-200 py-2 text-center text-xs font-bold text-ocean-800"
              >
                Download invoice
              </a>
            ) : null}
            <button
              type="button"
              onClick={newBooking}
              className="min-h-11 w-full rounded-full bg-ocean-800 py-2 text-sm font-bold text-white"
            >
              Book another trip
            </button>
          </div>
        ) : null}

        {/* Q&A input */}
        {(qaMode || state.step === "welcome") && state.step !== "confirmed" ? (
          <div className="flex gap-2 pt-1">
            <input
              className="min-h-11 flex-1 rounded-full border border-ocean-200 px-3 py-2 text-sm"
              placeholder={
                lang === "Hindi" ? "यहाँ लिखें…" : "Type here…"
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void askBot(input);
              }}
            />
            <button
              type="button"
              disabled={loading || !input.trim()}
              onClick={() => void askBot(input)}
              className="min-h-11 rounded-full bg-ocean-700 px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              Send
            </button>
          </div>
        ) : null}

        {state.step !== "welcome" && state.step !== "confirmed" ? (
          <button
            type="button"
            onClick={() => {
              if (state.step === "date") {
                setState((s) => ({ ...s, step: "welcome" }));
              } else if (state.step === "people") goStep("date", t("datePrompt", lang));
              else if (state.step === "pickup") goStep("people", t("peoplePrompt", lang));
              else if (state.step === "category") goStep("pickup", t("pickupPrompt", lang));
              else if (state.step === "packages") goStep("category", t("categoryPrompt", lang));
              else if (state.step === "review") goStep("packages", t("packagesPrompt", lang));
              else if (state.step === "contact") goStep("review");
              else if (state.step === "payment") goStep("contact", t("contactPrompt", lang));
            }}
            className="text-xs font-semibold text-ocean-600 hover:underline"
          >
            {t("back", lang)}
          </button>
        ) : null}
        </div>
      </div>
    </div>
  );
}
