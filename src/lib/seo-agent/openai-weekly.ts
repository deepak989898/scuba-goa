import type { SeoWeeklyDoc, SeoWeeklyReportDoc } from "@/lib/seo-agent/types";

export async function generateSeoWeeklyReport(
  snapshot: SeoWeeklyDoc,
): Promise<SeoWeeklyReportDoc | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;

  const model = process.env.AI_ANALYTICS_OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bookscubagoa.com";

  const system = `You are an SEO growth agent for Book Scuba Goa (${site}).\n\nRules:\n- SIMPLE English for the business owner.\n- Use only the data given.\n- Be practical and specific: exact title/meta examples, exact FAQ questions, and which pages to link.\n- Prefer changes that improve bookings (scuba, tours, booking page).`;

  const user = `Week: ${snapshot.weekId}\n\nSearch Console summary:\nTop pages: ${JSON.stringify(snapshot.topPages.slice(0, 10))}\nTop queries: ${JSON.stringify(snapshot.topQueries.slice(0, 12))}\nAudits: ${JSON.stringify(snapshot.audits.slice(0, 12))}\nIssues: ${JSON.stringify(snapshot.issues)}\nCompetitor gaps: ${JSON.stringify(snapshot.competitorGaps)}\n\nReturn JSON only:\n{\n  \"summaryMarkdown\": \"Weekly SEO report with ## headings: Summary, Wins, Problems, Page fixes, Content plan, Internal linking, Next week checklist\",\n  \"summaryPlain\": \"Short WhatsApp/Telegram summary (max 900 chars)\",\n  \"recommendations\": [\n    {\n      \"area\": \"titles|meta_descriptions|faqs|internal_links|schema|content_improvements|topic_clusters|publishing\",\n      \"priority\": \"high|medium|low\",\n      \"suggestion\": \"specific action\",\n      \"example\": \"optional example (title/meta/FAQ/schema snippet)\",\n      \"targetUrl\": \"optional full URL\"\n    }\n  ],\n  \"blogTopicsToQueue\": [\n    { \"title\": \"blog title\", \"serviceSlug\": \"optional service slug\", \"language\": \"hinglish|en|hi\" }\n  ]\n}\n\nRecommendations: 8-15 items.\nBlog topics: 6-12 titles. Group into 2-3 clusters (pillar + supporting).`;

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
      max_tokens: 2600,
      response_format: { type: "json_object" },
    }),
  });

  const data = await res.json();
  if (!res.ok) return null;

  const raw = data?.choices?.[0]?.message?.content?.trim();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<SeoWeeklyReportDoc>;
    return {
      weekId: snapshot.weekId,
      generatedAt: new Date().toISOString(),
      summaryMarkdown: String(parsed.summaryMarkdown ?? "").trim(),
      summaryPlain: String(parsed.summaryPlain ?? "").trim().slice(0, 900),
      openaiModel: model,
      recommendations: Array.isArray(parsed.recommendations)
        ? (parsed.recommendations as SeoWeeklyReportDoc["recommendations"]).slice(0, 25)
        : [],
      blogTopicsToQueue: Array.isArray(parsed.blogTopicsToQueue)
        ? (parsed.blogTopicsToQueue as SeoWeeklyReportDoc["blogTopicsToQueue"]).slice(0, 20)
        : [],
    };
  } catch {
    return null;
  }
}

