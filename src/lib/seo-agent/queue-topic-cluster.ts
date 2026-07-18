import { addTopicToQueue, listBlogTopicQueue } from "@/lib/blog-automation/topics";

/** SEO AI topic cluster — Water Sports + Scuba beginner content. */
export const SEO_TOPIC_CLUSTER = [
  {
    title: "Top 5 Scuba Diving Tips for Beginners",
    serviceSlug: "scuba-diving",
    language: "en" as const,
  },
  {
    title: "Best Water Sports Activities in Goa",
    serviceSlug: "water-sports",
    language: "en" as const,
  },
  {
    title: "Best Times for Water Sports in Goa",
    serviceSlug: "water-sports",
    language: "en" as const,
  },
  {
    title: "Scuba Diving Safety Tips",
    serviceSlug: "scuba-diving",
    language: "en" as const,
  },
  {
    title: "Exploring Grand Island: A Scuba Diving Guide",
    serviceSlug: "scuba-diving",
    language: "en" as const,
  },
  {
    title: "Dudhsagar Waterfall Tour: What to Expect",
    serviceSlug: "dudhsagar-trip",
    language: "en" as const,
  },
  {
    title: "Water Sports in Goa: Complete Beginner Guide",
    serviceSlug: "water-sports",
    language: "en" as const,
  },
] as const;

export async function queueSeoTopicCluster(): Promise<{
  added: string[];
  skipped: string[];
}> {
  const pending = await listBlogTopicQueue("pending");
  const pendingTitles = new Set(pending.map((p) => p.title.toLowerCase()));
  const added: string[] = [];
  const skipped: string[] = [];

  for (const topic of SEO_TOPIC_CLUSTER) {
    if (pendingTitles.has(topic.title.toLowerCase())) {
      skipped.push(topic.title);
      continue;
    }
    await addTopicToQueue({
      title: topic.title,
      serviceSlug: topic.serviceSlug,
      language: topic.language,
    });
    pendingTitles.add(topic.title.toLowerCase());
    added.push(topic.title);
  }

  return { added, skipped };
}
