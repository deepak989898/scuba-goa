"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function AiChatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; text: string }[]
  >([
    {
      role: "assistant",
      text: "Hi! Ask about scuba diving Goa, combos, or tonight’s slots—I’ll suggest the right package.",
    },
  ]);
  const [loading, setLoading] = useState(false);

  async function send() {
    const t = input.trim();
    if (!t || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: t }]);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: t }),
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
          text: "Could not reach AI. Use WhatsApp for immediate assistance.",
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
        className="fixed bottom-[7.25rem] right-4 z-[55] flex h-12 items-center gap-2 rounded-full border border-ocean-200 bg-white px-4 text-sm font-semibold text-ocean-800 shadow-lg md:bottom-8 md:right-[5.5rem]"
      >
        AI Help
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-[11rem] right-4 z-[55] flex w-[min(100vw-2.5rem,380px)] flex-col overflow-hidden rounded-2xl border border-ocean-100 bg-white shadow-2xl md:bottom-24 md:right-[5.5rem]"
          >
            <div className="flex items-center justify-between border-b border-ocean-100 bg-ocean-50 px-4 py-3">
              <p className="text-sm font-semibold text-ocean-900">Concierge</p>
              <button
                type="button"
                className="text-ocean-600"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
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
                placeholder="Ask anything…"
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
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
