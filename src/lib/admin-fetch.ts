import { getFirebaseAuth } from "@/lib/firebase";

/** Authenticated fetch for admin API routes (Bearer Firebase ID token). */
export async function adminFetch(path: string, init?: RequestInit) {
  const auth = getFirebaseAuth();
  if (!auth?.currentUser) {
    throw new Error("Sign in at /admin/login first.");
  }
  const token = await auth.currentUser.getIdToken();
  const res = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err =
      typeof data === "object" && data && "error" in data
        ? String((data as { error?: string }).error ?? "")
        : "";
    throw new Error(err || `Request failed (${res.status})`);
  }
  return data;
}
