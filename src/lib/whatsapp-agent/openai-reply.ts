import { buildBlogCatalogContext } from "@/lib/blog-automation/catalog-context";
import { SITE_URL } from "@/lib/constants";
import { bookingSessionSummary } from "@/lib/whatsapp-agent/booking-session";
import type { WhatsAppBookingSession } from "@/lib/whatsapp-agent/types";
import type { WhatsAppAgentSettings } from "@/lib/whatsapp-agent/settings";

function detectReplyLanguage(message: string): string {
  if (/[\u0900-\u097F]/.test(message)) return "Hindi/Hinglish";
  if (/[\u0C00-\u0C7F]/.test(message)) return "Telugu";
  if (/[\u0B80-\u0BFF]/.test(message)) return "Tamil";
  return "English";
}

export async function generateWhatsAppAgentReply(opts: {
  message: string;
  phone: string;
  history: { role: "user" | "assistant"; text: string }[];
  bookingSession: WhatsAppBookingSession;
  settings: WhatsAppAgentSettings;
  customerName?: string;
}): Promise<string> {
  const key = process.env.OPENAI_API_KEY?.trim();
  const site = SITE_URL.replace(/\/$/, "");
  const bookingUrl = `${site}/booking`;
  const catalog = await buildBlogCatalogContext();
  const lang = detectReplyLanguage(opts.message);
  const bookingCtx = bookingSessionSummary(opts.bookingSession);

  const intro = opts.settings.businessIntro.trim()
    ? opts.settings.businessIntro.trim()
    : "You work at Book Scuba Goa — a real travel desk in Baga, North Goa (scuba, water sports, packages).";

  const fallback = `Hi! 👋 Book Scuba Goa here — scuba & water sports in Baga. What date and how many people?`;

  if (!key) return fallback;

  const model = process.env.AI_ANALYTICS_OPENAI_MODEL?.trim() || "gpt-4o-mini";

  const system = `You are Priya from Book Scuba Goa — a real person replying on WhatsApp (Baga, North Goa).

${intro}

STYLE (most important):
- Sound like a busy but friendly human on WhatsApp — NOT a brochure or email.
- Keep replies SHORT: usually 1-3 short lines, under 200 characters. Hard max 280 characters.
- Use 0-1 emoji only. No markdown, no **bold**, no numbered lists unless customer asked for prices/options.
- One short answer + one short question is perfect. Example: "Hi! 😊 Scuba from ₹1200 in Baga. Which date works for you?"
- If they ask 2-3 things in one message, answer briefly in the same message — still keep it under 280 chars.

RULES:
- NEVER say AI/bot/automated.
- Reply in ${lang} — match customer (English, Hindi, or Hinglish).
- Use ONLY catalog prices. Never invent ₹ amounts.
- Booking flow: date → people → activity → send link when ready.
- Booking confirms only after Razorpay on website.
- If they want a human/call: say team will call back shortly.

BOOKING PROGRESS:
${bookingCtx}

When ready to book, add link on its own line:
${bookingUrl}

${catalog.textBlock}`;

  const messages = [
    { role: "system" as const, content: system },
    ...opts.history.slice(-10).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.text,
    })),
    {
      role: "user" as const,
      content: opts.customerName
        ? `[Customer: ${opts.customerName}] ${opts.message}`
        : opts.message,
    },
  ];

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.55,
        max_tokens: 180,
      }),
    });
    const data = await res.json();
    if (!res.ok) return fallback;
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) return fallback;
    return compactWhatsAppReply(text);
  } catch {
    return fallback;
  }
}

const WHATSAPP_REPLY_MAX = 320;

/** Trim AI output to short WhatsApp-style messages. */
function compactWhatsAppReply(text: string): string {
  let out = text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/^\s*[-•]\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (out.length <= WHATSAPP_REPLY_MAX) return out;

  // Keep booking link if present
  const urlMatch = out.match(/(https?:\/\/[^\s]+)/);
  const url = urlMatch?.[1];
  const withoutUrl = url ? out.replace(url, "").trim() : out;
  const budget = WHATSAPP_REPLY_MAX - (url ? url.length + 2 : 0);

  let short = withoutUrl.slice(0, Math.max(80, budget)).trim();
  const lastSpace = short.lastIndexOf(" ");
  if (lastSpace > 60) short = short.slice(0, lastSpace).trim();
  if (!short.endsWith(".") && !short.endsWith("?") && !short.endsWith("!")) {
    short += "…";
  }
  return url ? `${short}\n${url}` : short;
}

export function handoffReplyMessage(): string {
  const site = SITE_URL.replace(/\/$/, "");
  return `Sure 🙏 Our team will call you shortly. You can also book here: ${site}/booking`;
}
