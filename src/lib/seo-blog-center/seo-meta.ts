import { SITE_NAME, SITE_URL } from "@/lib/constants";
import type { SeoBlogKeyword, SeoBlogMeta } from "@/lib/seo-blog-center/types";
import { inferServiceSlug, slugify } from "@/lib/seo-blog-center/utils";

function defaultFaq(keyword: string): SeoBlogMeta["faq"] {
  return [
    {
      question: `How much does ${keyword} cost in Goa?`,
      answer: `Prices vary by package and season. Book Scuba Goa lists live ₹ prices on our booking page — typical scuba experiences start from affordable deposit options with balance paid on arrival.`,
    },
    {
      question: `Is ${keyword} safe for beginners?`,
      answer: `Yes — certified instructors guide first-timers with safety briefings, quality equipment, and shallow-water practice before your dive.`,
    },
    {
      question: `How do I book ${keyword}?`,
      answer: `Book online at bookscubagoa.com with a small deposit. Our team confirms your slot and shares pickup details for North or South Goa beaches.`,
    },
    {
      question: `What is the best time for ${keyword}?`,
      answer: `October to May offers the clearest seas in Goa. Morning slots are popular for calm water and better visibility.`,
    },
    {
      question: `Why choose Book Scuba Goa for ${keyword}?`,
      answer: `Licensed operators, transparent pricing, Grande Island trips, and WhatsApp support before and after your dive.`,
    },
  ];
}

export async function generateSeoMetaForKeyword(
  keyword: SeoBlogKeyword,
): Promise<SeoBlogMeta> {
  const slug = slugify(keyword.keyword);
  const canonicalUrl = `${SITE_URL.replace(/\/$/, "")}/blog/${slug}`;
  const serviceSlug = inferServiceSlug(keyword.keyword);
  const seoTitle = `${keyword.keyword} | ${SITE_NAME}`.slice(0, 60);
  const seoDescription = `Plan ${keyword.keyword.toLowerCase()} with ${SITE_NAME}. Live prices, certified instructors, Grande Island trips & easy online booking in Goa.`.slice(
    0,
    155,
  );

  const fallback: SeoBlogMeta = {
    id: `meta_${keyword.id}`,
    keywordId: keyword.id,
    keyword: keyword.keyword,
    seoTitle,
    seoDescription,
    focusKeyword: keyword.keyword,
    slug,
    faq: defaultFaq(keyword.keyword),
    metaKeywords: [
      keyword.keyword,
      "scuba diving Goa",
      "Book Scuba Goa",
      keyword.destination ?? "Goa",
      keyword.originCity ? `from ${keyword.originCity}` : "",
    ].filter(Boolean),
    openGraph: {
      title: seoTitle,
      description: seoDescription,
      url: canonicalUrl,
    },
    schemaMarkup: {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: seoTitle,
      description: seoDescription,
      keywords: keyword.keyword,
      author: { "@type": "Organization", name: SITE_NAME },
      publisher: {
        "@type": "Organization",
        name: SITE_NAME,
        logo: { "@type": "ImageObject", url: `${SITE_URL}/book-scuba-goa-logo.png` },
      },
      mainEntityOfPage: canonicalUrl,
    },
    canonicalUrl,
    serviceSlug,
    createdAt: new Date().toISOString(),
  };

  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return fallback;

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
          {
            role: "system",
            content:
              "You are an SEO expert for Book Scuba Goa. Return JSON only: seoTitle (max 60 chars), seoDescription (max 155), focusKeyword, metaKeywords (array), faq (array of {question, answer} with 5 items).",
          },
          {
            role: "user",
            content: JSON.stringify({
              keyword: keyword.keyword,
              destination: keyword.destination,
              originCity: keyword.originCity,
              category: keyword.category,
            }),
          },
        ],
        max_tokens: 800,
        temperature: 0.5,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(12_000),
    });

    if (!res.ok) return fallback;
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content?.trim();
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<SeoBlogMeta>;

    return {
      ...fallback,
      seoTitle: String(parsed.seoTitle ?? fallback.seoTitle).slice(0, 60),
      seoDescription: String(parsed.seoDescription ?? fallback.seoDescription).slice(0, 155),
      focusKeyword: String(parsed.focusKeyword ?? fallback.focusKeyword),
      metaKeywords: Array.isArray(parsed.metaKeywords)
        ? parsed.metaKeywords.map(String).filter(Boolean)
        : fallback.metaKeywords,
      faq:
        Array.isArray(parsed.faq) && parsed.faq.length >= 3
          ? parsed.faq.map((f) => ({
              question: String((f as { question?: string }).question ?? ""),
              answer: String((f as { answer?: string }).answer ?? ""),
            }))
          : fallback.faq,
      openGraph: {
        ...fallback.openGraph,
        title: String(parsed.seoTitle ?? fallback.seoTitle).slice(0, 60),
        description: String(parsed.seoDescription ?? fallback.seoDescription).slice(0, 155),
      },
    };
  } catch {
    return fallback;
  }
}

export function generateImageAltText(keyword: string, title: string): string {
  const base = keyword.trim() || title.trim();
  if (/scuba|diving|underwater/.test(base.toLowerCase())) {
    return `Scuba diving in Goa — ${base} — Book Scuba Goa`;
  }
  if (/water sport|parasail|jet ski/.test(base.toLowerCase())) {
    return `Water sports in Goa — ${base}`;
  }
  return `${base} — adventure activities in Goa with Book Scuba Goa`;
}
