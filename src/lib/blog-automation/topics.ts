import { getAdminDb } from "@/lib/firebase-admin";
import type { BlogLanguage } from "@/lib/blog-firestore";
import { getAllServicesServer } from "@/lib/get-services-server";

export type BlogTopicQueueItem = {
  id: string;
  title: string;
  slug: string;
  serviceSlug: string;
  language: BlogLanguage;
  status: "pending" | "used" | "skipped";
  order: number;
  createdAt: string;
  usedAt?: string;
};

const QUEUE = "blogTopicQueue";

function parseQueueItem(
  id: string,
  data: Record<string, unknown>,
): BlogTopicQueueItem | null {
  const title = String(data.title ?? "").trim();
  if (!title) return null;
  const langRaw = String(data.language ?? "hinglish");
  const language: BlogLanguage =
    langRaw === "en" || langRaw === "hi" || langRaw === "hinglish"
      ? langRaw
      : "hinglish";
  const statusRaw = String(data.status ?? "pending");
  const status: BlogTopicQueueItem["status"] =
    statusRaw === "used" || statusRaw === "skipped" ? statusRaw : "pending";
  return {
    id,
    title,
    slug: String(data.slug ?? "").trim(),
    serviceSlug: String(data.serviceSlug ?? "").trim(),
    language,
    status,
    order: Number(data.order) || 0,
    createdAt: String(data.createdAt ?? new Date().toISOString()),
    usedAt: data.usedAt != null ? String(data.usedAt) : undefined,
  };
}

export async function listBlogTopicQueue(
  status?: BlogTopicQueueItem["status"],
): Promise<BlogTopicQueueItem[]> {
  const db = getAdminDb();
  if (!db) return [];
  try {
    const snap = await db.collection(QUEUE).get();
    const items: BlogTopicQueueItem[] = [];
    for (const d of snap.docs) {
      const item = parseQueueItem(d.id, d.data() as Record<string, unknown>);
      if (!item) continue;
      if (status && item.status !== status) continue;
      items.push(item);
    }
    items.sort(
      (a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt),
    );
    return items;
  } catch (e) {
    console.error("[blog-topic-queue]", e);
    return [];
  }
}

export async function getNextPendingTopic(): Promise<BlogTopicQueueItem | null> {
  const pending = await listBlogTopicQueue("pending");
  return pending[0] ?? null;
}

export async function addTopicToQueue(input: {
  title: string;
  slug?: string;
  serviceSlug?: string;
  language?: BlogLanguage;
  order?: number;
}): Promise<string> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin not configured");
  const title = input.title.trim();
  if (!title) throw new Error("Title required");
  const pending = await listBlogTopicQueue("pending");
  const maxOrder = pending.reduce((m, i) => Math.max(m, i.order), 0);
  const ref = db.collection(QUEUE).doc();
  await ref.set({
    title,
    slug: input.slug?.trim() ?? "",
    serviceSlug: input.serviceSlug?.trim() ?? "",
    language: input.language ?? "hinglish",
    status: "pending",
    order: input.order ?? maxOrder + 1,
    createdAt: new Date().toISOString(),
  });
  return ref.id;
}

export async function updateTopicQueueItem(
  id: string,
  patch: Partial<Pick<BlogTopicQueueItem, "title" | "slug" | "serviceSlug" | "language" | "order" | "status">>,
): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin not configured");
  await db.collection(QUEUE).doc(id).update(patch);
}

export async function deleteTopicQueueItem(id: string): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin not configured");
  await db.collection(QUEUE).doc(id).delete();
}

export async function markTopicUsed(id: string): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  await db.collection(QUEUE).doc(id).update({
    status: "used",
    usedAt: new Date().toISOString(),
  });
}

/** Auto topics when admin queue is empty — rotates services + templates. */
export async function buildAutoTopic(
  topicIndex: number,
  language: BlogLanguage,
): Promise<{ title: string; serviceSlug: string }> {
  const services = await getAllServicesServer();
  const service = services[topicIndex % services.length];
  const name = service?.title ?? "Scuba diving in Goa";
  const slug = service?.slug ?? "scuba-diving";
  const templates = [
    `${name} in Goa: complete guide, prices & booking tips (${new Date().getFullYear()})`,
    `Best ${name.toLowerCase()} packages in Goa — what to expect before you book`,
    `${name} Goa: safety, timing, and how to choose the right operator`,
    `Top questions about ${name.toLowerCase()} in Goa — answered for first-timers`,
    `${name} near Baga & Calangute: itinerary, cost & honest review`,
    `How to book ${name.toLowerCase()} in Goa without overpaying — local tips`,
  ];
  const title = templates[Math.floor(topicIndex / services.length) % templates.length];
  return { title, serviceSlug: slug };
}
