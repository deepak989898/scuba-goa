import { getAdminDb } from "@/lib/firebase-admin";
import {
  DEFAULT_COMMAND_CENTER_SETTINGS,
  type CommandCenterSettings,
} from "@/lib/command-center/types";

const DOC = "commandCenter/settings";

export async function getCommandCenterSettings(): Promise<CommandCenterSettings> {
  const db = getAdminDb();
  if (!db) return DEFAULT_COMMAND_CENTER_SETTINGS;
  const snap = await db.doc(DOC).get();
  if (!snap.exists) return DEFAULT_COMMAND_CENTER_SETTINGS;
  const d = snap.data() as Partial<CommandCenterSettings>;
  return {
    enabled: d.enabled !== false,
    masterAiEnabled: d.masterAiEnabled !== false,
    autoCreateTasks: d.autoCreateTasks !== false,
    conflictPrevention: d.conflictPrevention !== false,
    notifyTelegram: d.notifyTelegram !== false,
  };
}

export async function saveCommandCenterSettings(
  patch: Partial<CommandCenterSettings>,
): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin not configured");
  await db.doc(DOC).set(patch, { merge: true });
}
