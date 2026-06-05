import { getAdminDb } from "@/lib/firebase-admin";
import { stripUndefinedDeep } from "@/lib/firestore-json";
import type {
  CommandCenterMemoryCategory,
  CommandCenterMemoryEntry,
} from "@/lib/command-center/types";

const MAX_ENTRIES = 90;

export async function appendMemory(
  category: CommandCenterMemoryCategory,
  entry: Omit<CommandCenterMemoryEntry, "at"> & { at?: string },
): Promise<void> {
  const db = getAdminDb();
  if (!db) return;

  const ref = db.collection("commandCenterMemory").doc(category);
  const snap = await ref.get();
  const existing = snap.exists
    ? ((snap.data() as { entries?: CommandCenterMemoryEntry[] }).entries ?? [])
    : [];

  const newEntry: CommandCenterMemoryEntry = {
    at: entry.at ?? new Date().toISOString(),
    dateIst: entry.dateIst,
    summary: entry.summary.slice(0, 500),
    data: entry.data,
  };

  const entries = [newEntry, ...existing].slice(0, MAX_ENTRIES);
  await ref.set(
    stripUndefinedDeep({
      category,
      entries,
      updatedAt: new Date().toISOString(),
    }),
  );
}

export async function loadMemory(
  category: CommandCenterMemoryCategory,
  limit = 20,
): Promise<CommandCenterMemoryEntry[]> {
  const db = getAdminDb();
  if (!db) return [];
  const snap = await db.collection("commandCenterMemory").doc(category).get();
  if (!snap.exists) return [];
  const entries = (snap.data() as { entries?: CommandCenterMemoryEntry[] }).entries ?? [];
  return entries.slice(0, limit);
}

export async function loadAllMemorySummaries(): Promise<
  Record<CommandCenterMemoryCategory, string[]>
> {
  const categories: CommandCenterMemoryCategory[] = [
    "business",
    "seo",
    "campaigns",
    "bookings",
    "customers",
    "decisions",
  ];
  const out = {} as Record<CommandCenterMemoryCategory, string[]>;
  for (const c of categories) {
    const entries = await loadMemory(c, 5);
    out[c] = entries.map((e) => `${e.dateIst}: ${e.summary}`);
  }
  return out;
}
