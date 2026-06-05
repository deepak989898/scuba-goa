import { getAdminDb } from "@/lib/firebase-admin";
import {
  DEFAULT_RECOVERY_SETTINGS,
  type RecoveryAgentSettings,
} from "@/lib/recovery-agent/types";

const DOC = "recoveryAgent/settings";

export async function getRecoveryAgentSettings(): Promise<RecoveryAgentSettings> {
  const db = getAdminDb();
  if (!db) return DEFAULT_RECOVERY_SETTINGS;
  const snap = await db.doc(DOC).get();
  if (!snap.exists) return DEFAULT_RECOVERY_SETTINGS;
  const d = snap.data() as Partial<RecoveryAgentSettings>;
  return {
    enabled: d.enabled !== false,
    recoveryDelayMinutes: Math.min(
      240,
      Math.max(15, Number(d.recoveryDelayMinutes ?? DEFAULT_RECOVERY_SETTINGS.recoveryDelayMinutes)),
    ),
    maxRecoveryAttempts: Math.min(
      5,
      Math.max(1, Number(d.maxRecoveryAttempts ?? DEFAULT_RECOVERY_SETTINGS.maxRecoveryAttempts)),
    ),
    urgencyEnabled: d.urgencyEnabled !== false,
    rateLimitPerPhonePerHour: Math.min(
      10,
      Math.max(1, Number(d.rateLimitPerPhonePerHour ?? DEFAULT_RECOVERY_SETTINGS.rateLimitPerPhonePerHour)),
    ),
    hotLeadScoreThreshold: Math.min(
      95,
      Math.max(40, Number(d.hotLeadScoreThreshold ?? DEFAULT_RECOVERY_SETTINGS.hotLeadScoreThreshold)),
    ),
  };
}

export async function saveRecoveryAgentSettings(
  patch: Partial<RecoveryAgentSettings>,
): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin not configured");
  await db.doc(DOC).set(patch, { merge: true });
}
