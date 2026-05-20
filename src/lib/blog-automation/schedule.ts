import { getAdminDb } from "@/lib/firebase-admin";
import {
  getIstNow,
  getNextDueSlot,
  getNextUpcomingSlot,
  type IstTimeParts,
} from "@/lib/blog-automation/schedule-utils";

export {
  defaultSlotsForCount,
  formatSlotFromMinutes,
  getIstNow,
  getNextDueSlot,
  getNextUpcomingSlot,
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

/** One slot per call — earliest IST time today that has passed and is not done yet. */
export async function getDueSlotNow(slots: string[]): Promise<string | null> {
  const now = getIstNow();
  const done = await getCompletedSlotsForDate(now.date);
  return getNextDueSlot(slots, now, done);
}

export async function getScheduleStatus(slots: string[]): Promise<{
  now: IstTimeParts;
  completedSlots: string[];
  dueNow: string | null;
  upcoming: string | null;
}> {
  const now = getIstNow();
  const completedSlots = await getCompletedSlotsForDate(now.date);
  return {
    now,
    completedSlots,
    dueNow: getNextDueSlot(slots, now, completedSlots),
    upcoming: getNextUpcomingSlot(slots, now, completedSlots),
  };
}
