import type {
  ConversionOptDailyDoc,
  ConversionOptReportDoc,
  ConversionRecommendation,
} from "@/lib/conversion-opt/types";

export async function generateConversionSuggestions(
  daily: ConversionOptDailyDoc,
): Promise<ConversionOptReportDoc | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;

  const model = process.env.AI_ANALYTICS_OPENAI_MODEL?.trim() || "gpt-4o-mini";

  const system = `You are a conversion optimization expert for Book Scuba Goa (scuba diving bookings in Goa, India).
Write simple English for the business owner. Give practical website changes only — no code.
Focus: headings, booking buttons, trust, pricing clarity, mobile UX.`;

  const user = `Date IST: ${daily.dateIst}

Funnel: ${JSON.stringify(daily.funnel)}
Journey: ${JSON.stringify(daily.journeyTotals)}
Issues: ${JSON.stringify(daily.issues)}
Low pages: ${JSON.stringify(daily.lowPerformingPages.slice(0, 5))}
Top landings: ${JSON.stringify(daily.topLandingPages.slice(0, 5))}

Return JSON:
{
  "summaryPlain": "3-5 sentence executive summary (max 800 chars)",
  "recommendations": [
    {
      "area": "headings|booking_buttons|trust|pricing|mobile",
      "priority": "high|medium|low",
      "suggestion": "specific change",
      "example": "example headline or button text"
    }
  ]
}
Give 5-8 recommendations covering all 5 areas where possible.`;

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
      max_tokens: 2200,
      response_format: { type: "json_object" },
    }),
  });

  const data = await res.json();
  if (!res.ok) return null;

  const raw = data?.choices?.[0]?.message?.content?.trim();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as {
      summaryPlain?: string;
      recommendations?: ConversionRecommendation[];
    };
    const recommendations = Array.isArray(parsed.recommendations)
      ? parsed.recommendations.slice(0, 10)
      : [];

    return {
      dateIst: daily.dateIst,
      generatedAt: new Date().toISOString(),
      summaryPlain: String(parsed.summaryPlain ?? "").trim().slice(0, 800),
      recommendations,
      openaiModel: model,
    };
  } catch {
    return null;
  }
}
