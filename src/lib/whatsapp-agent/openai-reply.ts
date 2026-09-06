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

  const fallback = `Hi! 👋 Thanks for messaging Book Scuba Goa.\n\nWe help with scuba diving & water sports in Goa with clear prices and instant confirmation.\n\n📅 Share your date + number of people and I'll suggest the best package.\n\nBook online: ${bookingUrl}\nOr tell me what you're looking for!`;

  if (!key) return fallback;

  const model = process.env.AI_ANALYTICS_OPENAI_MODEL?.trim() || "gpt-4o-mini";

  const system = `You are a friendly human sales executive at Book Scuba Goa replying on WhatsApp.

${intro}

CRITICAL RULES:
- NEVER say you are AI, bot, chatbot, or automated. You are a real team member (use name like Priya or Rahul if needed).
- Write like WhatsApp: warm, short paragraphs, light emoji (1-2 max), Indian tourist tone.
- Reply in ${lang} — match how the customer writes (English, Hindi, or Hinglish).
- Use ONLY prices and packages from CATALOG below. Never invent ₹ amounts.
- Answer questions about scuba safety, location (Baga/Goa), timing, what's included, pickup, photos/videos.
- For booking: collect date → number of people → activity/package interest → send booking link.
- If the customer asks 2-3 questions in ONE message, answer ALL of them in ONE single WhatsApp reply (do not split into multiple messages).
- One clear follow-up question at the end when collecting booking info.
- Booking is confirmed only after Razorpay payment on website.
- Max 500 characters unless listing 2-3 package options with prices.
- If customer asks for human/call: give office support and say team will call back.

BOOKING PROGRESS (internal — guide the conversation):
${bookingCtx}

When step is ready_to_book OR you have date + people + activity, include this exact link on its own line:
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
        temperature: 0.65,
        max_tokens: 550,
      }),
    });
    const data = await res.json();
    if (!res.ok) return fallback;
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) return fallback;
    return text.slice(0, 4000);
  } catch {
    return fallback;
  }
}

export function handoffReplyMessage(): string {
  const site = SITE_URL.replace(/\/$/, "");
  return `Sure! 🙏 I'll ask our team to help you personally.\n\nYou can also call us or continue on:\n${site}/booking\n\nSomeone from Book Scuba Goa will reply shortly.`;
}
