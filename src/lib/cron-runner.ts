import { after } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

const LEASE_MS = 20 * 60 * 1000;

/**
 * Acknowledge external schedulers immediately, then run inside Vercel's
 * waitUntil lifecycle. A Firestore lease prevents duplicate overlapping runs.
 */
export function scheduleCronTask<T>(
  name: string,
  task: () => Promise<T>,
): void {
  after(async () => {
    const db = getAdminDb();
    const ref = db?.collection("cronRunStatus").doc(name);
    const leaseId = crypto.randomUUID();
    const startedAt = new Date().toISOString();

    if (db && ref) {
      const acquired = await db.runTransaction(async (transaction) => {
        const snap = await transaction.get(ref);
        const data = snap.data() as { status?: string; startedAt?: string } | undefined;
        const previousStarted = Date.parse(data?.startedAt ?? "");
        const stillRunning =
          data?.status === "running" &&
          Number.isFinite(previousStarted) &&
          Date.now() - previousStarted < LEASE_MS;

        if (stillRunning) return false;
        transaction.set(
          ref,
          {
            name,
            status: "running",
            leaseId,
            startedAt,
            updatedAt: startedAt,
          },
          { merge: true },
        );
        return true;
      });

      if (!acquired) return;
    }

    try {
      const result = await task();
      const completedAt = new Date().toISOString();
      if (ref) {
        await ref.set(
          {
            status: "success",
            leaseId,
            completedAt,
            updatedAt: completedAt,
            lastResult: safeResultSummary(result),
            lastError: null,
          },
          { merge: true },
        );
      }
    } catch (error) {
      const completedAt = new Date().toISOString();
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[cron:${name}]`, error);
      if (ref) {
        await ref.set(
          {
            status: "error",
            leaseId,
            completedAt,
            updatedAt: completedAt,
            lastError: message.slice(0, 1000),
          },
          { merge: true },
        );
      }
    }
  });
}

function safeResultSummary(result: unknown): string {
  try {
    return JSON.stringify(result).slice(0, 4000);
  } catch {
    return String(result).slice(0, 4000);
  }
}
