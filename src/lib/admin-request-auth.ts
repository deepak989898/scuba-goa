import { getAuth } from "firebase-admin/auth";
import { getAdminApp, getAdminDb } from "@/lib/firebase-admin";

export type AdminAuthResult =
  | { ok: true; uid: string }
  | { ok: false; status: 401 | 403 | 500; error: string };

export async function authenticateAdminRequest(req: Request): Promise<AdminAuthResult> {
  const app = getAdminApp();
  const db = getAdminDb();
  if (!app || !db) {
    return { ok: false, status: 500, error: "Server not configured" };
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

  const adminDoc = await db.collection("admins").doc(uid).get();
  if (!adminDoc.exists) {
    return { ok: false, status: 403, error: "Not an admin" };
  }

  return { ok: true, uid };
}
