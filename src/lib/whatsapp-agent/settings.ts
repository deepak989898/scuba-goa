import { getAdminDb } from "@/lib/firebase-admin";

const SETTINGS_DOC = "whatsappAgent/settings";

export type WhatsAppAgentSettings = {
  enabled: boolean;
  /** Max auto-replies per user per hour (anti-spam). */
  maxRepliesPerUserPerHour: number;
  /** Pause auto-reply for N hours after user asks for a human. */
  handoffCooldownHours: number;
  /** Optional custom business intro (empty = AI default). */
  businessIntro: string;
  updatedAt: string;
};

export const DEFAULT_WHATSAPP_AGENT_SETTINGS: WhatsAppAgentSettings = {
  enabled: false,
  maxRepliesPerUserPerHour: 12,
  handoffCooldownHours: 4,
  businessIntro: "",
  updatedAt: new Date().toISOString(),
};

export function parseWhatsAppAgentSettings(
  data: Record<string, unknown> | undefined,
): WhatsAppAgentSettings {
  if (!data) return { ...DEFAULT_WHATSAPP_AGENT_SETTINGS };
  return {
    enabled: data.enabled === true,
    maxRepliesPerUserPerHour: Math.min(
      30,
      Math.max(1, Number(data.maxRepliesPerUserPerHour ?? 12)),
    ),
    handoffCooldownHours: Math.min(
      48,
      Math.max(1, Number(data.handoffCooldownHours ?? 4)),
    ),
    businessIntro: String(data.businessIntro ?? "").trim().slice(0, 500),
    updatedAt: String(data.updatedAt ?? new Date().toISOString()),
  };
}

export async function getWhatsAppAgentSettings(): Promise<WhatsAppAgentSettings> {
  const db = getAdminDb();
  if (!db) return { ...DEFAULT_WHATSAPP_AGENT_SETTINGS };
  const snap = await db.doc(SETTINGS_DOC).get();
  if (!snap.exists) return { ...DEFAULT_WHATSAPP_AGENT_SETTINGS };
  return parseWhatsAppAgentSettings(snap.data() as Record<string, unknown>);
}

export async function saveWhatsAppAgentSettings(
  patch: Partial<WhatsAppAgentSettings>,
): Promise<WhatsAppAgentSettings> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin not configured");
  const current = await getWhatsAppAgentSettings();
  const next: WhatsAppAgentSettings = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await db.doc(SETTINGS_DOC).set(next, { merge: true });
  return next;
}

export function isWhatsAppCloudConfigured(): boolean {
  return Boolean(
    process.env.META_WHATSAPP_TOKEN?.trim() &&
      process.env.META_WHATSAPP_PHONE_NUMBER_ID?.trim(),
  );
}
