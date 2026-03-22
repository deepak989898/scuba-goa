/** Normalize Firestore `includes` whether stored as string[] or comma-separated string */
export function parseFirestoreIncludes(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return (raw as unknown[]).map((x) => String(x).trim()).filter(Boolean);
  }
  if (typeof raw === "string") {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}
