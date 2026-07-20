/** Shared heading id helpers for blog TOC + BlogContent anchors. */

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export type BlogTocItem = {
  id: string;
  text: string;
  level: 2 | 3;
};

/** Extract H2/H3 from markdown for table of contents. */
export function extractBlogToc(content: string): BlogTocItem[] {
  const items: BlogTocItem[] = [];
  const seen = new Map<string, number>();
  const lines = content.split(/\n/);
  for (const line of lines) {
    const h2 = /^##\s+(.+)$/.exec(line.trim());
    const h3 = /^###\s+(.+)$/.exec(line.trim());
    const match = h2 ?? h3;
    if (!match) continue;
    const text = match[1].trim();
    if (!text) continue;
    const level = h2 ? 2 : 3;
    let id = slugifyHeading(text);
    const count = (seen.get(id) ?? 0) + 1;
    seen.set(id, count);
    if (count > 1) id = `${id}-${count}`;
    items.push({ id, text, level });
  }
  return items;
}
