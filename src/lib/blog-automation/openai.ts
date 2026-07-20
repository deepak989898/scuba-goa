import type { BlogLanguage } from "@/lib/blog-firestore";
import type { BlogFaq } from "@/data/blog/post-types";
import { normalizeBlogSlugInput } from "@/lib/blog-firestore";

export type GeneratedBlogDraft = {
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
  keywords: string[];
  content: string;
  faqs: BlogFaq[];
  readTime: string;
};

const LANG_INSTRUCTION: Record<BlogLanguage, string> = {
  en: "Write entirely in clear English for international tourists visiting Goa.",
  hi: "Write entirely in Hindi (Devanagari script). Use natural Hindi, not word-for-word translation.",
  hinglish:
    "Write in Hinglish — mix Hindi and English naturally (Roman script for Hindi words is OK). Sound like a friendly Goa local guide.",
};

function estimateReadTime(content: string): string {
  const words = content.split(/\s+/).filter(Boolean).length;
  const mins = Math.max(4, Math.min(14, Math.ceil(words / 200)));
  return `${mins} min read`;
}

export async function generateBlogWithOpenAI(input: {
  title: string;
  serviceName: string;
  serviceSlug: string;
  language: BlogLanguage;
  preferredSlug?: string;
  /** Live services/packages catalog — required for accurate pricing in posts. */
  catalogContext?: string;
}): Promise<GeneratedBlogDraft> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not configured");

  const year = new Date().getFullYear();
  const catalog = input.catalogContext?.trim() ?? "";
  const system = `You are an expert SEO content writer for Book Scuba Goa (scuba diving, water sports, tours in Goa, India).
${LANG_INSTRUCTION[input.language]}

CRITICAL RULES — never invent:
- Fake certifications, instructor names, review counts, dive counts, years of experience, awards
- Fake availability, “slots left”, “booked today”, or live scarcity
- Exact visibility/depth guarantees — use “typically”, “approximately”, “may vary”, “confirm before booking”
- Medical guarantees — advise seeking a doctor when relevant

Writing quality:
- Helpful first, SEO second. Natural paragraphs of varying length. No keyword stuffing.
- Avoid repeating clichés like “unforgettable experience”.
- Vary section structure by topic; do not use the identical outline for every article.
- Flag safety, weather, medical and price claims as needing operator confirmation when uncertain.

Structure:
- Markdown with ## and ### headings, short paragraphs, bullets only when useful.
- Start with a 2–3 sentence direct answer to search intent.
- Include 5–8 internal links using markdown like [Book now](/booking) and [Scuba diving packages](/services/${input.serviceSlug}). Use ONLY internal paths (no full URLs). Always include /booking and /services/${input.serviceSlug} at least once.
- When the topic involves cost/packages, include a "## Prices & packages (Book Scuba Goa)" section with exact ₹ prices from the OFFICIAL CATALOG only — never invent prices.
- FAQs must match claims made in the article body.
- Year reference: ${year}.
${catalog ? `\n${catalog}\n` : ""}
Return ONLY valid JSON (no markdown fence) matching this schema:
{
  "title": string,
  "slug": string (lowercase hyphenated, max 80 chars, no numeric suffix unless required),
  "metaTitle": string (max 60 chars, do not repeat brand name unnecessarily),
  "metaDescription": string (145-160 chars, compelling, unique),
  "excerpt": string (max 160 chars, unique),
  "keywords": string[] (8-12 items),
  "content": string (markdown, typically 1200-2200 useful words — no filler),
  "faqs": [{"question": string, "answer": string}] (5-8 items matching the body)
}`;

  const user = `Write a complete SEO blog post.
Topic title: ${input.title}
Related service: ${input.serviceName} (slug: ${input.serviceSlug})
${input.preferredSlug ? `Preferred slug if suitable: ${input.preferredSlug}` : ""}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: 4500,
      temperature: 0.65,
      response_format: { type: "json_object" },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message ?? "OpenAI request failed");
  }

  const raw = data?.choices?.[0]?.message?.content?.trim();
  if (!raw) throw new Error("Empty OpenAI response");

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error("Invalid JSON from OpenAI");
  }

  const title = String(parsed.title ?? input.title).trim();
  let slug = normalizeBlogSlugInput(
    String(parsed.slug ?? input.preferredSlug ?? title),
  );
  if (!slug) slug = normalizeBlogSlugInput(input.title);

  const content = String(parsed.content ?? "").trim();
  if (!content || content.length < 400) {
    throw new Error("Generated content too short");
  }

  const faqs: BlogFaq[] = [];
  if (Array.isArray(parsed.faqs)) {
    for (const f of parsed.faqs) {
      if (!f || typeof f !== "object") continue;
      const q = String((f as { question?: string }).question ?? "").trim();
      const a = String((f as { answer?: string }).answer ?? "").trim();
      if (q && a) faqs.push({ question: q, answer: a });
    }
  }

  const keywords = Array.isArray(parsed.keywords)
    ? parsed.keywords.map((k) => String(k).trim()).filter(Boolean)
    : [];

  return {
    title,
    slug,
    metaTitle: String(parsed.metaTitle ?? title).trim().slice(0, 70),
    metaDescription: String(parsed.metaDescription ?? "").trim().slice(0, 160),
    excerpt: String(parsed.excerpt ?? "").trim().slice(0, 200),
    keywords,
    content,
    faqs,
    readTime: estimateReadTime(content),
  };
}
