import { NextResponse } from "next/server";
import { fallbackPackages } from "@/data/fallback-packages";
import { fallbackServices } from "@/data/services";
import {
  appendConversationMessage,
  loadConversation,
} from "@/lib/recovery-agent/conversations";
import { generateRecoveryChatReply } from "@/lib/recovery-agent/openai-recovery";
import { upsertRecoveryLead } from "@/lib/recovery-agent/lead-tracker";

const SYSTEM = `You are Book Scuba Goa AI Sales Closer.

Goal: convert visitors into bookings.
Rules:
- Keep replies under 140 words.
- Reply in short sales style: recommendation, urgency, action.
- Use only package/service data provided in CATALOG context.
- Never invent prices or availability.
- You MAY use this promotional line when relevant:
  "Limited-time ad offer: up to ₹500 off on selected plans. Confirm at booking."
- Always end with a clear CTA:
  1) open /booking
  2) share date + people + pickup area
  3) ask if they want WhatsApp handoff.
- For users who seem unsure, compare 2 options max and suggest one best-fit.
- For users asking "is booking confirmed", say:
  "Booking is confirmed after successful payment and verification."
`;

const ALLOWED_LANGS = new Set([
  "english",
  "hindi",
  "telugu",
  "marathi",
  "gujarati",
  "punjabi",
  "tamil",
  "kannada",
  "malayalam",
  "bengali",
  "odia",
]);

function topServiceLines() {
  return fallbackServices
    .slice()
    .sort((a, b) => {
      const aScore = (a.bookedToday ?? 0) * 3 + (a.limitedSlots ? 4 : 0);
      const bScore = (b.bookedToday ?? 0) * 3 + (b.limitedSlots ? 4 : 0);
      return bScore - aScore;
    })
    .slice(0, 8)
    .map((s) => {
      const slots = s.slotsLeft != null ? `${s.slotsLeft} slots left` : "slots unknown";
      const booked = s.bookedToday != null ? `${s.bookedToday} booked today` : "";
      return `- ${s.title} (slug: ${s.slug}) · From ₹${s.priceFrom} · ${s.duration} · ${slots}${booked ? ` · ${booked}` : ""}`;
    })
    .join("\n");
}

function topPackageLines() {
  return fallbackPackages
    .slice()
    .sort((a, b) => {
      const aScore = (a.bookedToday ?? 0) * 3 + (a.limitedSlots ? 4 : 0);
      const bScore = (b.bookedToday ?? 0) * 3 + (b.limitedSlots ? 4 : 0);
      return bScore - aScore;
    })
    .slice(0, 8)
    .map((p) => {
      const slots = p.slotsLeft != null ? `${p.slotsLeft} slots left` : "slots unknown";
      const booked = p.bookedToday != null ? `${p.bookedToday} booked today` : "";
      return `- ${p.name} (id: ${p.id}) · ₹${p.price} · ${p.duration} · ${slots}${booked ? ` · ${booked}` : ""}`;
    })
    .join("\n");
}

export async function POST(req: Request) {
  let body: { message?: string; language?: string; sessionId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json({ error: "Empty message" }, { status: 400 });
  }

  const sessionId = body.sessionId?.trim().slice(0, 128) || "";
  if (sessionId) {
    void upsertRecoveryLead({ sessionId, event: "session_visit" }).catch(() => {});
  }

  const rawLang = body.language?.trim() || "English";
  const langKey = rawLang.toLowerCase();
  const replyLanguage = ALLOWED_LANGS.has(langKey) ? rawLang : "English";
  const langBlock = `The user chose to chat in: ${replyLanguage}. Write your entire reply in ${replyLanguage} only (natural wording for native speakers). If the user writes in another language, still answer in ${replyLanguage}.`;
  const catalogBlock = `CATALOG (dynamic starter context):
Top services:
${topServiceLines()}

Top packages:
${topPackageLines()}

Priority conversion flow:
- If user asks broad query, suggest 1 best package + 1 backup.
- Mention urgency only when slots are low or bookedToday is high.
- Encourage immediate booking on /booking.`;

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return NextResponse.json({
      reply:
        "AI is offline. Add OPENAI_API_KEY to enable smart replies. For instant booking, use the green WhatsApp button with your dates and group size.",
    });
  }

  const prev = sessionId ? await loadConversation(sessionId) : null;
  const history =
    prev?.messages.map((m) => ({ role: m.role, text: m.text })) ?? [];

  try {
    let text: string | null = null;

    if (sessionId) {
      text = await generateRecoveryChatReply({
        message,
        language: replyLanguage,
        history,
      });
    }

    if (!text) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: `${SYSTEM}\n\n${langBlock}\n\n${catalogBlock}` },
            ...history.map((m) => ({ role: m.role, content: m.text })),
            { role: "user", content: message },
          ],
          max_tokens: 280,
          temperature: 0.5,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const err = data?.error?.message ?? "OpenAI error";
        return NextResponse.json({ reply: err }, { status: 200 });
      }
      text = data?.choices?.[0]?.message?.content?.trim() ?? null;
    }

    const reply = text || "Try rephrasing your question.";

    if (sessionId) {
      await appendConversationMessage({
        sessionId,
        language: replyLanguage,
        role: "user",
        text: message,
      });
      await appendConversationMessage({
        sessionId,
        language: replyLanguage,
        role: "assistant",
        text: reply,
      });
    }

    return NextResponse.json({ reply });
  } catch (e) {
    return NextResponse.json({
      reply: e instanceof Error ? e.message : "Chat unavailable",
    });
  }
}
