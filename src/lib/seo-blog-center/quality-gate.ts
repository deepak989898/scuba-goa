import { blogSlugBlocksNewPost } from "@/lib/blog-posts-server";
import { getPostBySlug } from "@/data/blog-posts";
import type { SeoBlogDraft } from "@/lib/seo-blog-center/types";

const FAKE_SCARCITY =
  /\b(slots? left|booked today|only \d+ left|70 booked|limited slots)\b/i;
const FAKE_GUARANTEE = /\b(100%\s*safe|guaranteed sighting|always available)\b/i;

export type QualityResult = {
  score: number;
  notes: string[];
  blocking: string[];
};

export async function validateDraftQuality(
  draft: Pick<
    SeoBlogDraft,
    | "title"
    | "slug"
    | "metaTitle"
    | "metaDescription"
    | "content"
    | "faqs"
    | "featuredImageUrl"
    | "featuredImageAlt"
  >,
): Promise<QualityResult> {
  const notes: string[] = [];
  const blocking: string[] = [];
  let score = 100;

  if (!draft.title?.trim()) {
    blocking.push("Missing title");
    score -= 30;
  }
  if (!draft.slug?.trim()) {
    blocking.push("Missing slug");
    score -= 30;
  }
  if (draft.slug && (getPostBySlug(draft.slug) || (await blogSlugBlocksNewPost(draft.slug)))) {
    blocking.push("Slug already used by a published post");
    score -= 25;
  }
  if (!draft.metaTitle?.trim() || draft.metaTitle.length < 20) {
    notes.push("Meta title short or missing");
    score -= 8;
  }
  if (!draft.metaDescription?.trim() || draft.metaDescription.length < 80) {
    notes.push("Meta description short or missing");
    score -= 8;
  }
  if ((draft.content?.length ?? 0) < 600) {
    blocking.push("Content too thin");
    score -= 20;
  }
  const h1Count = (draft.content.match(/^#\s+/gm) || []).length;
  if (h1Count > 0) {
    notes.push("Body contains markdown H1 — prefer H2+ under page H1");
    score -= 5;
  }
  if (!draft.faqs?.length) {
    notes.push("No FAQs");
    score -= 10;
  }
  if (FAKE_SCARCITY.test(draft.content) || FAKE_SCARCITY.test(draft.metaDescription)) {
    blocking.push("Fake scarcity / urgency wording detected");
    score -= 25;
  }
  if (FAKE_GUARANTEE.test(draft.content)) {
    blocking.push("Unsupported guarantee wording detected");
    score -= 20;
  }
  if (!draft.featuredImageUrl?.trim()) {
    notes.push("Missing featured image");
    score -= 10;
  }
  if (draft.featuredImageUrl && !draft.featuredImageAlt?.trim()) {
    notes.push("Missing image alt text");
    score -= 5;
  }

  score = Math.max(0, Math.min(100, score));
  return { score, notes, blocking };
}
