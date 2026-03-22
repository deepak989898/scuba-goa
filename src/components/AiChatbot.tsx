"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

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

const WELCOME: Record<string, string> = {
  English:
    "Hi! Pick a language above if you need to change it. Ask about scuba diving in Goa, packages, or booking — I’ll help in your language.",
  Hindi:
    "नमस्ते! गोवा में स्कूबा डाइविंग, पैकेज या बुकिंग के बारे में पूछें — मैं आपकी भाषा में मदद करूँगा।",
  Telugu:
    "నమస్కారం! గోవాలో స్కూబా డైవింగ్, ప్యాకేజీలు లేదా బుకింగ్ గురించి అడగండి — మీ భాషలో సహాయం చేస్తాను.",
  Marathi:
    "नमस्कार! गोव्यात स्कूबा डायव्हिंग, पॅकेज किंवा बुकिंग विषयी विचारा — मी तुमच्या भाषेत मदत करेन.",
  Gujarati:
    "નમસ્તે! ગોવામાં સ્કૂબા ડાઇવિંગ, પેકેજ અથવા બુકિંગ વિશે પૂછો — હું તમારી ભાષામાં મદદ કરીશ.",
  Punjabi:
    "ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਗੋਵਾ ਵਿੱਚ ਸਕੂਬਾ ਡਾਈਵਿੰਗ, ਪੈਕੇਜ ਜਾਂ ਬੁਕਿੰਗ ਬਾਰੇ ਪੁੱਛੋ — ਮੈਂ ਤੁਹਾਡੀ ਭਾਸ਼ਾ ਵਿੱਚ ਮਦਦ ਕਰਾਂਗਾ।",
  Tamil:
    "வணக்கம்! கோவாவில் ஸ்கூபா டைவிங், பேக்கேஜ்கள் அல்லது புக்கிங் பற்றி கேளுங்கள் — உங்கள் மொழியில் உதவுகிறேன்.",
  Kannada:
    "ನಮಸ್ಕಾರ! ಗೋವಾದಲ್ಲಿ ಸ್ಕೂಬಾ ಡೈವಿಂಗ್, ಪ್ಯಾಕೇಜ್ ಅಥವಾ ಬುಕಿಂಗ್ ಬಗ್ಗೆ ಕೇಳಿ — ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ಸಹಾಯ ಮಾಡುತ್ತೇನೆ.",
  Malayalam:
    "നമസ്കാരം! ഗോവയിലെ സ്കൂബാ ഡൈവിംഗ്, പാക്കേജുകൾ, ബുക്കിംഗ് എന്നിവ ചോദിക്കൂ — നിങ്ങളുടെ ഭാഷയിൽ സഹായിക്കാം.",
  Bengali:
    "নমস্কার! গোয়ায় স্কুবা ডাইভিং, প্যাকেজ বা বুকিং নিয়ে জিজ্ঞাসা করুন — আপনার ভাষায় সাহায্য করব।",
  Odia:
    "ନମସ୍କାର! ଗୋଆରେ ସ୍କୁବା ଡାଇଭିଂ, ପ୍ୟାକେଜ୍ କିମ୍ବା ବୁକିଂ ବିଷୟରେ ପଚାରନ୍ତୁ — ଆପଣଙ୍କ ଭାଷାରେ ସାହାଯ୍ୟ କରିବି।",
};

function welcomeFor(api: string) {
  return WELCOME[api] ?? WELCOME.English!;
}

export function AiChatbot() {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<string | null>(null);
  const [pickLang, setPickLang] = useState(true);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; text: string }[]
  >([]);
  const [loading, setLoading] = useState(false);

  const hydrateLang = useCallback(() => {
    try {
      const s = sessionStorage.getItem(STORAGE_KEY);
      if (s && LANGUAGES.some((l) => l.api === s)) {
        setLang(s);
        setPickLang(false);
        setMessages([{ role: "assistant", text: welcomeFor(s) }]);
        return;
      }
    } catch {
      /* ignore */
    }
    setLang(null);
    setPickLang(true);
    setMessages([]);
  }, []);

  useEffect(() => {
    hydrateLang();
  }, [hydrateLang]);

  function selectLanguage(api: string) {
    try {
      sessionStorage.setItem(STORAGE_KEY, api);
    } catch {
      /* ignore */
    }
    setLang(api);
    setPickLang(false);
    setMessages([{ role: "assistant", text: welcomeFor(api) }]);
  }

  function openLanguageMenu() {
    setPickLang(true);
    setMessages([]);
  }

  async function send() {
    const t = input.trim();
    if (!t || loading || !lang) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: t }]);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: t, language: lang }),
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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-[calc(12rem+env(safe-area-inset-bottom,0px))] right-4 z-[55] flex h-12 items-center gap-2 rounded-full border border-ocean-200 bg-white px-4 text-sm font-semibold text-ocean-800 shadow-lg md:bottom-8 md:right-[5.5rem]"
      >
        Help
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-[calc(16rem+env(safe-area-inset-bottom,0px))] right-4 z-[55] flex w-[min(100vw-2.5rem,380px)] flex-col overflow-hidden rounded-2xl border border-ocean-100 bg-white shadow-2xl md:bottom-24 md:right-[5.5rem]"
          >
            <div className="flex items-center justify-between border-b border-ocean-100 bg-ocean-50 px-4 py-3">
              <p className="text-sm font-semibold text-ocean-900">AI Help</p>
              <div className="flex items-center gap-2">
                {lang && !pickLang ? (
                  <button
                    type="button"
                    className="text-xs font-medium text-ocean-600 underline"
                    onClick={openLanguageMenu}
                  >
                    Language
                  </button>
                ) : null}
                <button
                  type="button"
                  className="text-ocean-600"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            {pickLang ? (
              <div className="max-h-[min(70vh,420px)] space-y-3 overflow-y-auto p-4">
                <p className="text-sm font-medium text-ocean-900">
                  Which language should we use?
                </p>
                <p className="text-xs text-ocean-600">
                  The assistant will reply in the language you choose so it is
                  easier to understand.
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.api}
                      type="button"
                      onClick={() => selectLanguage(l.api)}
                      className="rounded-xl border border-ocean-200 bg-white px-3 py-2.5 text-left text-sm text-ocean-900 transition hover:border-ocean-400 hover:bg-ocean-50"
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="max-h-72 space-y-2 overflow-y-auto p-4 text-sm">
                  {messages.map((m, i) => (
                    <p
                      key={i}
                      className={
                        m.role === "user"
                          ? "ml-4 rounded-lg bg-ocean-600 px-3 py-2 text-white"
                          : "mr-4 rounded-lg bg-ocean-50 px-3 py-2 text-ocean-900"
                      }
                    >
                      {m.text}
                    </p>
                  ))}
                  {loading ? (
                    <p className="text-xs text-ocean-500">Thinking…</p>
                  ) : null}
                </div>
                <div className="flex gap-2 border-t border-ocean-100 p-3">
                  <input
                    className="flex-1 rounded-full border border-ocean-200 px-3 py-2 text-sm"
                    placeholder={
                      lang === "Hindi"
                        ? "अपना सवाल लिखें…"
                        : "Type your question…"
                    }
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && send()}
                  />
                  <button
                    type="button"
                    onClick={send}
                    className="rounded-full bg-ocean-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Send
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
