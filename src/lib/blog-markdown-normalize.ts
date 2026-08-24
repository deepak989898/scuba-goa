/** Normalize markdown for blog/guide display and GSC ranking improve saves. */
export function normalizeRankingMarkdown(content: string): string {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of lines) {
    let l = line;
    if (/^\s*[\*•]\s+/.test(l)) {
      l = l.replace(/^\s*[\*•]\s+/, "- ");
    }
    if (/^\s*\*\*([^*]+)\*\*\s*$/.test(l.trim())) {
      const title = l.trim().replace(/^\*\*|\*\*$/g, "");
      out.push(`## ${title}`);
      continue;
    }
    out.push(l);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
