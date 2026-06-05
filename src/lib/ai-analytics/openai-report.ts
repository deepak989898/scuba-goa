import type { AiAnalyticsDailyDoc } from "@/lib/ai-analytics/types";

export async function generateAiDailyReport(
  snapshot: AiAnalyticsDailyDoc,
): Promise<{ summaryMarkdown: string; summaryPlain: string; model: string } | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;

  const model = process.env.AI_ANALYTICS_OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bookscubagoa.com";

  const system = `You are the AI analytics agent for Book Scuba Goa (${site}), a Goa scuba diving and tours booking website.
Write a concise daily business report for the owner in plain English (India timezone).
Use bullet points. Include: traffic, bookings, revenue, WhatsApp interest, payment issues, SEO highlights, and 3 actionable fixes for tomorrow.
Be specific with numbers from the JSON. Do not invent data.`;

  const user = `Daily analytics snapshot (IST date ${snapshot.dateIst}):
${JSON.stringify(snapshot, null, 2)}

Return JSON only:
{
  "summaryMarkdown": "markdown report for admin dashboard",
  "summaryPlain": "short plain text for Telegram/WhatsApp (max 1200 chars)"
}`;

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
      temperature: 0.4,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    }),
  });

  const data = await res.json();
  if (!res.ok) return null;

  const raw = data?.choices?.[0]?.message?.content?.trim();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as {
      summaryMarkdown?: string;
      summaryPlain?: string;
    };
    return {
      summaryMarkdown: String(parsed.summaryMarkdown ?? "").trim(),
      summaryPlain: String(parsed.summaryPlain ?? "").trim().slice(0, 1200),
      model,
    };
  } catch {
    return null;
  }
}
