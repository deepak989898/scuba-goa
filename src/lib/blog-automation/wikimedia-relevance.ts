/** Reject scans, letters, maps, and other non-photo Wikimedia hits. */
const WIKIMEDIA_REJECT_RE =
  /letter|manuscript|document|book\s*page|old\s*book|scan\b|portrait|painting|oil\s*on|watercolor|map\b|cartograph|engraving|archive|newspaper|thumbnail|icon\b|logo\b|diagram|chart|flag\b|coat\s*of\s*arms|seal\b|coin\b|medal|statue|monument|temple\s*interior|interior\s*of|facade|building\s*façade|\b16\d{2}\b|\b17\d{2}\b|\b18\d{2}\b|humfry|smith\s*m\.?a|friend\s*to\s*a|inscription|handwriting|calligraphy|vellum|parchment/i;

export function isRelevantWikimediaFileTitle(title: string): boolean {
  const t = title.trim();
  if (!t) return false;
  if (WIKIMEDIA_REJECT_RE.test(t)) return false;
  // Prefer photographic subjects
  if (
    /\.(svg|gif|djvu|pdf|tiff?)$/i.test(t) ||
    /icon|logo|map|diagram/i.test(t)
  ) {
    return false;
  }
  return true;
}

export function scoreWikimediaRelevance(title: string, query: string): number {
  const file = title.toLowerCase();
  const q = query.toLowerCase();
  let score = 50;
  const topicWords = q
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !["goa", "india", "from"].includes(w));
  for (const w of topicWords) {
    if (file.includes(w)) score += 12;
  }
  if (/goa/i.test(file)) score += 15;
  if (/scuba|diving|underwater|beach|ocean|sea|boat|island/i.test(file)) {
    score += 10;
  }
  if (WIKIMEDIA_REJECT_RE.test(file)) score = 0;
  return score;
}
