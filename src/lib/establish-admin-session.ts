import { getFirebaseAuth } from "@/lib/firebase";

/** Set HttpOnly admin session cookie after Firebase sign-in (for middleware gate). */
export async function establishAdminSession(): Promise<boolean> {
  const auth = getFirebaseAuth();
  const user = auth?.currentUser;
  if (!user) return false;

  const token = await user.getIdToken();
  const res = await fetch("/api/admin/session", {
    method: "POST",
    credentials: "include",
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok;
}

/** Clear HttpOnly admin session cookie on sign-out. */
export async function clearAdminSession(): Promise<void> {
  await fetch("/api/admin/session", {
    method: "DELETE",
    credentials: "include",
  }).catch(() => null);
}
