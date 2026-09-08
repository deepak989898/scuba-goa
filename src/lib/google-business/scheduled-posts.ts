import { getAdminDb } from "@/lib/firebase-admin";

/** Scheduled Google Business Profile posts — published server-side only. */
export const GOOGLE_BUSINESS_POSTS_COLLECTION = "googleBusinessPosts";

export type GoogleBusinessPostStatus =
  | "draft"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed"
  | "cancelled";

export type GoogleBusinessScheduledPost = {
  id: string;
  content: string;
  imageUrl?: string;
  ctaType: "LEARN_MORE" | "BOOK" | "ORDER" | "SIGN_UP" | "CALL";
  ctaUrl: string;
  scheduledAt: string | null;
  status: GoogleBusinessPostStatus;
  googleLocationName: string;
  createdAt: string;
  publishedAt: string | null;
  googlePostName: string | null;
  error: string | null;
  createdByUid?: string;
};

export async function createGoogleBusinessScheduledPost(
  post: Omit<GoogleBusinessScheduledPost, "id"> & { id?: string },
): Promise<GoogleBusinessScheduledPost> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin not configured");
  const id = post.id?.trim() || `gbp_${Date.now()}`;
  const doc: GoogleBusinessScheduledPost = { ...post, id };
  await db.collection(GOOGLE_BUSINESS_POSTS_COLLECTION).doc(id).set(doc);
  return doc;
}

export async function listDueGoogleBusinessPosts(
  nowIso: string,
): Promise<GoogleBusinessScheduledPost[]> {
  const db = getAdminDb();
  if (!db) return [];
  const snap = await db
    .collection(GOOGLE_BUSINESS_POSTS_COLLECTION)
    .where("status", "==", "scheduled")
    .where("scheduledAt", "<=", nowIso)
    .limit(20)
    .get();
  return snap.docs.map((d) => d.data() as GoogleBusinessScheduledPost);
}

export async function updateGoogleBusinessScheduledPost(
  id: string,
  patch: Partial<GoogleBusinessScheduledPost>,
): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin not configured");
  await db.collection(GOOGLE_BUSINESS_POSTS_COLLECTION).doc(id).set(patch, { merge: true });
}
