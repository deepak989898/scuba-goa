import { detectContentTopic } from "@/lib/content-topic";
import { FAQ_POOL_BY_TOPIC } from "@/lib/seo-health/faq-data";

export type GuideFaq = { question: string; answer: string };

/** Pick topic-relevant FAQs for a guide page (no stored FAQ field on seoPages). */
export function buildGuideFaqs(input: {
  headline: string;
  metaDescription: string;
  keywords: string[];
}): GuideFaq[] {
  const topic = detectContentTopic({
    title: input.headline,
    keywords: input.keywords,
  });
  const pool = [...FAQ_POOL_BY_TOPIC[topic]];
  const hay =
    `${input.headline} ${input.metaDescription} ${input.keywords.join(" ")}`.toLowerCase();

  const scored = pool.map((faq) => {
    const q = faq.question.toLowerCase();
    const a = faq.answer.toLowerCase();
    let score = 0;
    for (const token of hay.split(/[^a-z0-9]+/).filter((t) => t.length >= 4)) {
      if (q.includes(token) || a.includes(token)) score += 1;
    }
    if (hay.includes("price") && q.includes("price")) score += 3;
    if (hay.includes("book") && q.includes("book")) score += 2;
    if (hay.includes("russian") && (q.includes("russian") || a.includes("russian"))) {
      score += 4;
    }
    if (hay.includes("night") && (q.includes("night") || a.includes("night"))) {
      score += 2;
    }
    return { faq, score };
  }).sort((a, b) => b.score - a.score);

  const picked: GuideFaq[] = [];
  const seen = new Set<string>();
  for (const row of scored) {
    if (picked.length >= 6) break;
    if (seen.has(row.faq.question)) continue;
    seen.add(row.faq.question);
    picked.push({ question: row.faq.question, answer: row.faq.answer });
  }

  if (picked.length < 4) {
    for (const faq of pool) {
      if (picked.length >= 5) break;
      if (seen.has(faq.question)) continue;
      picked.push({ question: faq.question, answer: faq.answer });
    }
  }

  return picked;
}
