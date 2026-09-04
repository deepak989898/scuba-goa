import type { ServiceItem } from "@/data/services";
import {
  detectContentTopic,
  TOPIC_SERVICE_DEPRIORITIZE,
  TOPIC_SERVICE_PRIORITY,
} from "@/lib/content-topic";

function priorityBoost(slugs: string[], serviceSlug: string): number {
  const idx = slugs.findIndex(
    (s) => serviceSlug === s || serviceSlug.includes(s) || s.includes(serviceSlug),
  );
  if (idx < 0) return 0;
  return (slugs.length - idx) * 10;
}

function scoreService(
  service: ServiceItem,
  tokens: Set<string>,
  topic: ReturnType<typeof detectContentTopic>,
  focusSlug?: string,
): number {
  const text = `${service.slug} ${service.title} ${service.short}`.toLowerCase();
  let score = service.slug === focusSlug ? 120 : 0;

  for (const token of tokens) {
    if (text.includes(token)) score += 2;
  }

  score += priorityBoost(TOPIC_SERVICE_PRIORITY[topic], service.slug);

  const deprioritize = TOPIC_SERVICE_DEPRIORITIZE[topic];
  if (deprioritize?.test(text)) score -= 25;

  return score;
}

function rankServices(
  services: ServiceItem[],
  content: { title: string; keywords: string[] },
  focusSlug?: string,
): { service: ServiceItem; score: number }[] {
  const topic = detectContentTopic(content);
  const tokens = new Set(
    `${content.title} ${content.keywords.join(" ")}`
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 3),
  );

  return [...services]
    .filter((s) => s.active !== false)
    .map((service) => ({
      service,
      score: scoreService(service, tokens, topic, focusSlug),
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        (a.service.sortOrder ?? 999) - (b.service.sortOrder ?? 999),
    );
}

/** Top N catalog services scored against page title/keywords (sidebar related row). */
export function relatedServicesForContent(
  services: ServiceItem[],
  content: { title: string; keywords: string[] },
  focusSlug?: string,
  limit = 4,
): ServiceItem[] {
  return rankServices(services, content, focusSlug)
    .slice(0, limit)
    .map(({ service }) => service);
}

export type SplitServicesSidebar = {
  related: ServiceItem[];
  other: ServiceItem[];
};

/** Related packages first; remaining picks for collapsible “Other services”. */
export function splitServicesForContentSidebar(
  services: ServiceItem[],
  content: { title: string; keywords: string[] },
  focusSlug?: string,
  relatedLimit = 3,
  otherLimit = 5,
): SplitServicesSidebar {
  const ranked = rankServices(services, content, focusSlug);
  const related: ServiceItem[] = [];
  const other: ServiceItem[] = [];
  const used = new Set<string>();

  for (const row of ranked) {
    if (related.length >= relatedLimit) break;
    if (row.score < 1 && row.service.slug !== focusSlug) continue;
    related.push(row.service);
    used.add(row.service.slug);
  }

  if (related.length === 0 && ranked[0]) {
    related.push(ranked[0].service);
    used.add(ranked[0].service.slug);
  }

  for (const row of ranked) {
    if (other.length >= otherLimit) break;
    if (used.has(row.service.slug)) continue;
    other.push(row.service);
    used.add(row.service.slug);
  }

  return { related, other };
}
