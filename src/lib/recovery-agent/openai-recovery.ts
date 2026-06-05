import type { RecoveryLeadDoc } from "@/lib/recovery-agent/types";
import { buildBlogCatalogContext } from "@/lib/blog-automation/catalog-context";

export async function generateRecoveryWhatsAppMessage(opts: {
  lead: RecoveryLeadDoc;
  urgencyEnabled: boolean;
}): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;

  const model = process.env.AI_ANALYTICS_OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bookscubagoa.com";
  const catalog = await buildBlogCatalogContext();

  const amount =
    opts.lead.signals.lastAmountPaise != null
      ? `₹${Math.round(opts.lead.signals.lastAmountPaise / 100)}`
      : "your selected package";

  const system = `You write short WhatsApp recovery messages for Book Scuba Goa (${site}).
Rules:
- Max 320 characters.
- Friendly, simple English (Indian tourist).
- Mention scuba in Goa, safety, instant WhatsApp help.
- Include booking link: ${site}/booking
- Do NOT invent prices — use catalog context only.
- ${opts.urgencyEnabled ? "Add soft urgency (limited slots today) only if appropriate." : "No fake urgency."}`;

  const user = `Lead: ${opts.lead.name || "Guest"}, score ${opts.lead.score}, temp ${opts.lead.temperature}
Abandoned after: checkout dismiss/fail
Cart approx: ${amount}
Signals: ${JSON.stringify(opts.lead.signals)}

${catalog.textBlock}

Write ONE WhatsApp message to recover the booking. Return JSON: { "message": "..." }`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.45,
      max_tokens: 400,
      response_format: { type: "json_object" },
    }),
  });

  const data = await res.json();
  if (!res.ok) return null;
  const raw = data?.choices?.[0]?.message?.content?.trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { message?: string };
    return String(parsed.message ?? "").trim().slice(0, 400) || null;
  } catch {
    return null;
  }
}

export async function generateRecoveryChatReply(opts: {
  message: string;
  language: string;
  history: { role: "user" | "assistant"; text: string }[];
}): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;

  const catalog = await buildBlogCatalogContext();
  const model = process.env.AI_ANALYTICS_OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bookscubagoa.com";

  const system = `You are Book Scuba Goa WhatsApp-style sales assistant.
Answer scuba diving, packages, safety, timing, location (Goa), pricing using CATALOG only.
Language: ${opts.language}. Max 140 words. End with CTA to ${site}/booking or WhatsApp help.
${catalog.textBlock}`;

  const messages = [
    { role: "system" as const, content: system },
    ...opts.history.slice(-8).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.text,
    })),
    { role: "user" as const, content: opts.message },
  ];

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
      max_tokens: 500,
    }),
  });

  const data = await res.json();
  if (!res.ok) return null;
  return data?.choices?.[0]?.message?.content?.trim() ?? null;
}
