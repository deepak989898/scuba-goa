import { getAdminDb } from "@/lib/firebase-admin";

const COL = "seoBlogRedirects";

export type SeoBlogRedirect = {
  source: string;
  destination: string;
  createdAt: string;
  updatedAt: string;
  reason?: string;
};

function normalizePath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed.startsWith("/")) return `/${trimmed}`;
  const noTrail = trimmed.replace(/\/+$/, "");
  return noTrail || "/";
}

/** Firestore doc IDs cannot contain "/" — encode normalized paths. */
function pathToDocId(path: string): string {
  return Buffer.from(normalizePath(path), "utf8").toString("base64url");
}

export async function getSeoBlogRedirect(
  sourcePath: string,
): Promise<string | null> {
  const db = getAdminDb();
  if (!db) return null;
  const source = normalizePath(sourcePath);
  try {
    const snap = await db.collection(COL).doc(pathToDocId(source)).get();
    if (!snap.exists) return null;
    const dest = String((snap.data() as SeoBlogRedirect).destination ?? "").trim();
    return dest ? normalizePath(dest) : null;
  } catch {
    return null;
  }
}

export async function saveSeoBlogRedirect(input: {
  source: string;
  destination: string;
  reason?: string;
}): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Database not configured");
  const source = normalizePath(input.source);
  const destination = normalizePath(input.destination);
  const now = new Date().toISOString();
  await db
    .collection(COL)
    .doc(pathToDocId(source))
    .set({
      source,
      destination,
      reason: input.reason?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    });
}
