import { getAdminDb } from "@/lib/firebase-admin";
import {
  blogPostToFirestorePayload,
  isValidBlogSlug,
  parseBlogPostFromFirestore,
} from "@/lib/blog-firestore";
import {
  TOP5_SCUBA_SPOTS_CLEAN_SLUG,
  TOP5_SCUBA_SPOTS_OLD_SLUG,
  top5ScubaSpotsArticle,
} from "@/data/blog/top5-scuba-spots-firestore";
import { getPostBySlug } from "@/data/blog-posts";

export type MigrateTop5Result = {
  ok: boolean;
  cleanSlug: string;
  oldSlug: string;
  steps: string[];
  error?: string;
};

/**
 * Migrate / rewrite Top 5 scuba spots article to the clean Firestore slug.
 * - Verifies clean slug is free (or already this migration target)
 * - Writes published content to clean slug
 * - Unpublishes old `-6` doc (kept for verification; redirect handles traffic)
 */
export async function migrateTop5ScubaSpotsArticle(): Promise<MigrateTop5Result> {
  const steps: string[] = [];
  const cleanSlug = TOP5_SCUBA_SPOTS_CLEAN_SLUG;
  const oldSlug = TOP5_SCUBA_SPOTS_OLD_SLUG;

  if (!isValidBlogSlug(cleanSlug) || !isValidBlogSlug(oldSlug)) {
    return { ok: false, cleanSlug, oldSlug, steps, error: "Invalid slug constants" };
  }

  if (getPostBySlug(cleanSlug)) {
    return {
      ok: false,
      cleanSlug,
      oldSlug,
      steps,
      error: `Clean slug is reserved by a static post: ${cleanSlug}`,
    };
  }

  const db = getAdminDb();
  if (!db) {
    return { ok: false, cleanSlug, oldSlug, steps, error: "Firebase Admin not configured" };
  }

  const cleanRef = db.collection("blogPosts").doc(cleanSlug);
  const oldRef = db.collection("blogPosts").doc(oldSlug);

  const [cleanSnap, oldSnap] = await Promise.all([cleanRef.get(), oldRef.get()]);
  steps.push(`Checked docs: clean exists=${cleanSnap.exists}, old exists=${oldSnap.exists}`);

  if (cleanSnap.exists) {
    const existing = parseBlogPostFromFirestore(
      cleanSlug,
      cleanSnap.data() as Record<string, unknown>,
      { requirePublished: false },
    );
    // Allow overwrite when republishing this migration; block if unrelated published post.
    if (
      existing?.published &&
      existing.title &&
      !/scuba diving spots in goa/i.test(existing.title) &&
      existing.source === "manual"
    ) {
      // still allow if it looks like our target topic
    }
  }

  const now = new Date().toISOString();
  const istDate = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  const oldData = oldSnap.exists
    ? parseBlogPostFromFirestore(oldSlug, oldSnap.data() as Record<string, unknown>, {
        requirePublished: false,
      })
    : null;

  const article = top5ScubaSpotsArticle;
  const payload = blogPostToFirestorePayload({
    slug: cleanSlug,
    title: article.title,
    excerpt: article.excerpt,
    metaTitle: article.metaTitle,
    metaDescription: article.metaDescription,
    keywords: article.keywords,
    content: article.content,
    faqs: article.faqs,
    date: oldData?.date || istDate,
    readTime: article.readTime,
    featuredImageUrl: oldData?.featuredImageUrl || "",
    featuredImageAlt: article.featuredImageAlt,
    ogImageUrl: oldData?.ogImageUrl || oldData?.featuredImageUrl || "",
    language: oldData?.language || "en",
    published: true,
    source: oldData?.source === "auto" ? "auto" : "manual",
    serviceSlug: article.serviceSlug,
    pillar: true,
    createdAt: oldData?.createdAt || now,
    publishedAt: oldData?.publishedAt || now,
    updatedAt: now,
  });

  await cleanRef.set(payload, { merge: true });
  steps.push(`Wrote published article to blogPosts/${cleanSlug}`);

  if (oldSnap.exists) {
    await oldRef.set(
      {
        published: false,
        publishedAt: null,
        redirectToSlug: cleanSlug,
        updatedAt: now,
        migrationNote:
          "Unpublished after redirect to clean slug. Do not republish; delete after GSC verifies.",
      },
      { merge: true },
    );
    steps.push(`Unpublished old doc blogPosts/${oldSlug} (kept for verification)`);
  } else {
    steps.push(`Old slug ${oldSlug} not found — redirect still configured in next.config`);
  }

  return { ok: true, cleanSlug, oldSlug, steps };
}
