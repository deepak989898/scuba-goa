import { randomBytes } from "crypto";
import { getAdminDb } from "@/lib/firebase-admin";

const COLLECTION = "socialMediaOAuthState";

export async function createSocialOAuthState(
  provider: string,
  adminUid: string,
): Promise<string> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin not configured");
  const state = randomBytes(24).toString("hex");
  const expiresAt = Date.now() + 15 * 60 * 1000;
  await db.collection(COLLECTION).doc(state).set({
    provider,
    adminUid,
    expiresAt,
  });
  return state;
}

export async function consumeSocialOAuthState(
  provider: string,
  state: string,
): Promise<{ adminUid: string } | null> {
  const db = getAdminDb();
  if (!db || !state.trim()) return null;
  const ref = db.collection(COLLECTION).doc(state.trim());
  const snap = await ref.get();
  if (!snap.exists) return null;
  const data = snap.data() as {
    provider?: string;
    adminUid?: string;
    expiresAt?: number;
  };
  await ref.delete().catch(() => {});
  if (
    data.provider !== provider ||
    !data.adminUid ||
    !data.expiresAt ||
    data.expiresAt < Date.now()
  ) {
    return null;
  }
  return { adminUid: data.adminUid };
}
