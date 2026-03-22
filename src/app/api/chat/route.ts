import { NextResponse } from "next/server";

const SYSTEM = `You are Book Scuba Goa, a premium concierge for scuba diving Goa, water sports Goa booking, Goa tour packages, Dudhsagar trips, casinos, clubs, flyboarding, and bungee. Keep replies under 120 words, suggest next steps (book, cart, WhatsApp), and never invent prices—say "check live rates on site".`;

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

export async function POST(req: Request) {
  let body: { message?: string; language?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json({ error: "Empty message" }, { status: 400 });
  }

  const rawLang = body.language?.trim() || "English";
  const langKey = rawLang.toLowerCase();
  const replyLanguage = ALLOWED_LANGS.has(langKey) ? rawLang : "English";
  const langBlock = `The user chose to chat in: ${replyLanguage}. Write your entire reply in ${replyLanguage} only (natural wording for native speakers). If the user writes in another language, still answer in ${replyLanguage}.`;

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return NextResponse.json({
      reply:
        "AI is offline. Add OPENAI_API_KEY to enable smart replies. For instant booking, use the green WhatsApp button with your dates and group size.",
    });
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: `${SYSTEM}\n\n${langBlock}` },
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
    const text = data?.choices?.[0]?.message?.content?.trim();
    return NextResponse.json({
      reply: text || "Try rephrasing your question.",
    });
  } catch (e) {
    return NextResponse.json({
      reply: e instanceof Error ? e.message : "Chat unavailable",
    });
  }
}
