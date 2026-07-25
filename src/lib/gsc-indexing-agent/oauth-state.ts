import { randomBytes } from "crypto";
import { getAdminDb } from "@/lib/firebase-admin";

const COLLECTION = "gscOAuthState";
const TTL_MS = 15 * 60 * 1000;

export async function createGscOAuthState(adminUid: string): Promise<string> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin not configured");
  const state = randomBytes(24).toString("hex");
  await db.collection(COLLECTION).doc(state).set({
    adminUid,
    expiresAt: Date.now() + TTL_MS,
  });
  return state;
}

export async function consumeGscOAuthState(
  state: string,
): Promise<{ adminUid: string } | null> {
  const db = getAdminDb();
  if (!db || !state.trim()) return null;
  const ref = db.collection(COLLECTION).doc(state.trim());
  const snap = await ref.get();
  if (!snap.exists) return null;
  const data = snap.data() as { adminUid?: string; expiresAt?: number };
  await ref.delete().catch(() => {});
  if (!data.adminUid || !data.expiresAt || data.expiresAt < Date.now()) {
    return null;
  }
  return { adminUid: data.adminUid };
}
