import type { AiAnalyticsDailyDoc } from "@/lib/ai-analytics/types";

export type AiReportResult = {
  summaryMarkdown: string;
  summaryPlain: string;
  headline: string;
  actions: string[];
  model: string;
};

export async function generateAiDailyReport(
  snapshot: AiAnalyticsDailyDoc,
): Promise<AiReportResult | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;

  const model = process.env.AI_ANALYTICS_OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bookscubagoa.com";
  const m = snapshot.internal;

  const system = `You write daily business reports for the owner of Book Scuba Goa (${site}), a scuba diving & Goa tours website.

Rules:
- Use SIMPLE English (easy for Indian business owner). Short sentences. No JSON, no technical jargon.
- Use real numbers only from the data provided.
- Be direct: good news first, then problems, then clear actions.`;

  const user = `Date (IST): ${snapshot.dateIst}

Key metrics:
- Visitors: ${m.visitors}, Page views: ${m.pageViews}, Bounce: ${m.bounceRatePct}%
- Bookings paid: ${m.bookingsPaid}, Revenue ₹${m.bookingRevenueInr}, Conversion: ${m.bookingConversionRatePct}%
- WhatsApp clicks: ${m.whatsappClicks}, Phone clicks: ${m.phoneClicks}
- Payments: success ${m.paymentSuccess}, failed ${m.paymentFailed}, dismissed ${m.paymentDismissed}
- Top pages: ${m.topPages.slice(0, 5).map((p) => `${p.path}(${p.views})`).join(", ") || "none"}

Return JSON only:
{
  "headline": "One sentence summary for email header (max 120 chars)",
  "summaryMarkdown": "Full report with ## headings: Summary, Traffic, Bookings, Problems, Tomorrow's 3 actions. Use bullet lists.",
  "summaryPlain": "Short version for Telegram (max 900 chars, line breaks, emoji ok)",
  "actions": ["action 1", "action 2", "action 3"]
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
      temperature: 0.35,
      max_tokens: 1800,
      response_format: { type: "json_object" },
    }),
  });

  const data = await res.json();
  if (!res.ok) return null;

  const raw = data?.choices?.[0]?.message?.content?.trim();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as {
      headline?: string;
      summaryMarkdown?: string;
      summaryPlain?: string;
      actions?: string[];
    };
    const actions = Array.isArray(parsed.actions)
      ? parsed.actions.map((a) => String(a).trim()).filter(Boolean).slice(0, 5)
      : [];
    return {
      headline: String(parsed.headline ?? "").trim().slice(0, 160),
      summaryMarkdown: String(parsed.summaryMarkdown ?? "").trim(),
      summaryPlain: String(parsed.summaryPlain ?? "").trim().slice(0, 900),
      actions,
      model,
    };
  } catch {
    return null;
  }
}
