import { getAdminDb } from "@/lib/firebase-admin";
import {
  getIstNow,
  isSlotDueInWindow,
  type IstTimeParts,
} from "@/lib/blog-automation/schedule-utils";

export {
  defaultSlotsForCount,
  formatSlotFromMinutes,
  getIstNow,
  normalizePublishSlotsIst,
  parseSlotToMinutes,
  type IstTimeParts,
} from "@/lib/blog-automation/schedule-utils";

const DAILY_RUNS_COLLECTION = "blogDailyRuns";

export async function getCompletedSlotsForDate(
  date: string,
): Promise<string[]> {
  const db = getAdminDb();
  if (!db) return [];
  const ref = await db.collection(DAILY_RUNS_COLLECTION).doc(date).get();
  if (!ref.exists) return [];
  const raw = ref.data()?.completedSlots;
  if (!Array.isArray(raw)) return [];
  return raw.map((s) => String(s).trim()).filter(Boolean);
}

export async function markSlotCompleted(
  date: string,
  slot: string,
): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  const docRef = db.collection(DAILY_RUNS_COLLECTION).doc(date);
  const existing = await getCompletedSlotsForDate(date);
  if (existing.includes(slot)) return;
  await docRef.set(
    {
      date,
      completedSlots: [...existing, slot],
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
}

export async function getDueSlotNow(
  slots: string[],
): Promise<string | null> {
  const now = getIstNow();
  const done = await getCompletedSlotsForDate(now.date);
  for (const slot of slots) {
    if (done.includes(slot)) continue;
    if (isSlotDueInWindow(slot, now)) return slot;
  }
  return null;
}
