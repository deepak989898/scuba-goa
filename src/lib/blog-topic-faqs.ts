import type { BlogFaq } from "@/data/blog/post-types";
import { classifyContent } from "@/lib/content-clusters";
import { buildGuideFaqs } from "@/lib/guide-faqs";

const TOPIC_FAQ_PATTERNS: Record<string, RegExp> = {
  nightlife: /night|club|russian|pub|disco|party|nightlife/i,
  scuba: /scuba|diving|underwater|snorkel|padi/i,
  casino: /casino|cruise|poker|gambling/i,
  watersports: /water sport|parasail|jet ski|flyboard|bungee/i,
  dolphin: /dolphin|boat trip/i,
  tour: /tour|sightseeing|dudhsagar|north goa|south goa/i,
  general: /goa|book|pickup|season/i,
};

function faqsMatchTopic(faqs: BlogFaq[], topic: string): boolean {
  const pattern = TOPIC_FAQ_PATTERNS[topic] ?? TOPIC_FAQ_PATTERNS.general;
  const matches = faqs.filter((f) => pattern.test(f.question)).length;
  return matches >= Math.max(1, Math.ceil(faqs.length * 0.4));
}

/** Topic-aware FAQs for blog pages — replaces off-topic stored FAQs (e.g. scuba on nightlife posts). */
export function getTopicAwareBlogFaqs(post: {
  title: string;
  excerpt: string;
  keywords: string[];
  faqs?: BlogFaq[];
}): BlogFaq[] {
  const topic = classifyContent({
    title: post.title,
    keywords: post.keywords,
  });
  const generated = buildGuideFaqs({
    headline: post.title,
    metaDescription: post.excerpt,
    keywords: post.keywords,
  });
  const stored = post.faqs ?? [];
  if (stored.length === 0) return generated;
  if (faqsMatchTopic(stored, topic)) return stored;
  return generated;
}
