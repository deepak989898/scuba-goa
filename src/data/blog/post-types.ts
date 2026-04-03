export type BlogFaq = {
  question: string;
  answer: string;
};

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  keywords: string[];
  /** Main article body: ## h2, ### h3, paragraphs, - lists, **bold**, [label](/path) links */
  content: string;
  /** Optional override for <title>; defaults to "{title} | Book Scuba Goa" in layout */
  metaTitle?: string;
  /** Pillar guides (homepage preview + editorial priority) */
  pillar?: boolean;
  faqs?: BlogFaq[];
};
