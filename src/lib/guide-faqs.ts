import { BOOK_SCUBA_FAQ } from "@/lib/seo-health/faq-data";

export type GuideFaq = { question: string; answer: string };

/** Pick topic-relevant FAQs for a guide page (no stored FAQ field on seoPages). */
export function buildGuideFaqs(input: {
  headline: string;
  metaDescription: string;
  keywords: string[];
}): GuideFaq[] {
  const hay = `${input.headline} ${input.metaDescription} ${input.keywords.join(" ")}`.toLowerCase();
  const scored = BOOK_SCUBA_FAQ.map((faq) => {
    const q = faq.question.toLowerCase();
    let score = 0;
    for (const token of hay.split(/[^a-z0-9]+/).filter((t) => t.length >= 4)) {
      if (q.includes(token) || faq.answer.toLowerCase().includes(token)) score += 1;
    }
    if (hay.includes("calangute") && q.includes("where")) score += 2;
    if (hay.includes("beginner") && q.includes("beginner")) score += 3;
    if (hay.includes("price") && q.includes("price")) score += 3;
    if (hay.includes("water sport") && q.includes("water")) score += 2;
    if (hay.includes("dudhsagar") && faq.answer.toLowerCase().includes("dudhsagar"))
      score += 3;
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
    for (const faq of BOOK_SCUBA_FAQ) {
      if (picked.length >= 5) break;
      if (seen.has(faq.question)) continue;
      picked.push({ question: faq.question, answer: faq.answer });
    }
  }

  return picked;
}
