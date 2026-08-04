import { getAuth } from "firebase-admin/auth";
import {
  getAdminApp,
  getAdminDb,
  getFirebaseAdminInitMessage,
} from "@/lib/firebase-admin";

export type AdminAuthResult =
  | { ok: true; uid: string }
  | { ok: false; status: 401 | 403 | 500; error: string };

/** Avoid N× `admins/{uid}` reads on a single admin page load. */
const adminUidCache = new Map<string, { ok: boolean; at: number }>();
const ADMIN_CACHE_TTL_MS = 5 * 60 * 1000;

export async function authenticateAdminRequest(
  req: Request,
): Promise<AdminAuthResult> {
  const app = getAdminApp();
  const db = getAdminDb();
  if (!app || !db) {
    const detail = getFirebaseAdminInitMessage();
    return {
      ok: false,
      status: 500,
      error: detail
        ? `Server not configured (${detail})`
        : "Server not configured (FIREBASE_SERVICE_ACCOUNT_KEY missing on Vercel)",
    };
  }

  const h = req.headers.get("authorization");
  const token = h?.startsWith("Bearer ") ? h.slice(7).trim() : null;
  if (!token) {
    return { ok: false, status: 401, error: "Missing authorization" };
  }

  let uid: string;
  try {
    const decoded = await getAuth(app).verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return { ok: false, status: 401, error: "Invalid or expired token" };
  }

  const cached = adminUidCache.get(uid);
  if (cached && Date.now() - cached.at < ADMIN_CACHE_TTL_MS) {
    if (!cached.ok) {
      return { ok: false, status: 403, error: "Not an admin" };
    }
    return { ok: true, uid };
  }

  try {
    const adminDoc = await db.collection("admins").doc(uid).get();
    const isAdmin = adminDoc.exists;
    adminUidCache.set(uid, { ok: isAdmin, at: Date.now() });
    if (!isAdmin) {
      return { ok: false, status: 403, error: "Not an admin" };
    }
    return { ok: true, uid };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const lower = msg.toLowerCase();
    const quota =
      lower.includes("resource_exhausted") ||
      lower.includes("quota") ||
      lower.includes("exceeded") ||
      lower.includes("8 resource_exhausted");
    return {
      ok: false,
      status: 500,
      error: quota
        ? `Firestore quota/unavailable while checking admin access: ${msg}. Wait for daily read reset, or check Firebase Usage & billing.`
        : `Firestore admin check failed: ${msg}`,
    };
  }
}
