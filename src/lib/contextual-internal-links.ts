import type { ClusterContentItem, ContentMeta } from "@/lib/content-clusters";
import { classifyContent, scoreClusterRelevance } from "@/lib/content-clusters";

type EnrichInput = ContentMeta & {
  slug: string;
  kind: "guide" | "blog";
};

type PhraseLink = {
  phrase: RegExp;
  href: string;
};

function alreadyLinked(content: string, href: string): boolean {
  return content.includes(`](${href})`) || content.includes(`](${href}/`);
}

function hasMarkdownLinkForPhrase(content: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\[([^\\]]*${escaped}[^\\]]*)\\]\\(`, "i").test(content);
}

function buildPhraseLinks(
  current: EnrichInput,
  catalog: ClusterContentItem[],
  maxLinks: number,
): PhraseLink[] {
  const topic = classifyContent(current);
  const candidates = catalog
    .filter(
      (item) =>
        !(item.kind === current.kind && item.slug === current.slug) &&
        item.topic === topic,
    )
    .map((item) => ({
      item,
      score: scoreClusterRelevance(current, item),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxLinks * 2);

  const links: PhraseLink[] = [];

  for (const { item } of candidates) {
    const titleWords = item.title
      .replace(/[|–—]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 5)
      .slice(0, 4);
    for (const word of titleWords) {
      links.push({
        phrase: new RegExp(`\\b(${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})\\b`, "i"),
        href: item.href,
      });
    }
    if (item.slug.includes("morjim") || item.title.toLowerCase().includes("morjim")) {
      links.push({ phrase: /\b(Morjim)\b/i, href: item.href });
    }
    if (item.slug.includes("arambol") || item.title.toLowerCase().includes("arambol")) {
      links.push({ phrase: /\b(Arambol)\b/i, href: item.href });
    }
    if (item.slug.includes("ashwem") || item.title.toLowerCase().includes("ashwem")) {
      links.push({ phrase: /\b(Ashwem)\b/i, href: item.href });
    }
    if (item.slug.includes("vagator") || item.title.toLowerCase().includes("vagator")) {
      links.push({ phrase: /\b(Vagator)\b/i, href: item.href });
    }
    if (/price|entry|fee/.test(item.slug) || /price|entry|fee/i.test(item.title)) {
      links.push({ phrase: /\b(entry fee|cover charge|entry price)\b/i, href: item.href });
    }
    if (/ruskii|ruski|review/.test(item.slug)) {
      links.push({ phrase: /\b(Club Ruskii|Ruskii)\b/i, href: item.href });
    }
  }

  return links;
}

/**
 * Add 3–6 natural internal links to markdown body content from the same topic cluster.
 * Skips phrases that are already linked; never modifies existing markdown links.
 */
export function enrichMarkdownWithClusterLinks(
  content: string,
  current: EnrichInput,
  catalog: ClusterContentItem[],
  maxLinks = 5,
): string {
  if (!content.trim() || catalog.length === 0) return content;

  let out = content;
  let added = 0;
  const phraseLinks = buildPhraseLinks(current, catalog, maxLinks);

  for (const { phrase, href } of phraseLinks) {
    if (added >= maxLinks) break;
    if (alreadyLinked(out, href)) continue;

    const match = out.match(phrase);
    if (!match || !match[1]) continue;
    const phraseText = match[1];
    if (hasMarkdownLinkForPhrase(out, phraseText)) continue;

    const replacement = `[${phraseText}](${href})`;
    out = out.replace(phrase, replacement);
    added += 1;
  }

  return out;
}
