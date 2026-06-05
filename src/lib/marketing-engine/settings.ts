import { getAdminDb } from "@/lib/firebase-admin";
import {
  DEFAULT_MARKETING_SETTINGS,
  type MarketingEngineSettings,
} from "@/lib/marketing-engine/types";

const DOC = "marketingAgent/settings";

export async function getMarketingEngineSettings(): Promise<MarketingEngineSettings> {
  const db = getAdminDb();
  if (!db) return DEFAULT_MARKETING_SETTINGS;
  const snap = await db.doc(DOC).get();
  if (!snap.exists) return DEFAULT_MARKETING_SETTINGS;
  const d = snap.data() as Partial<MarketingEngineSettings>;
  return {
    enabled: d.enabled !== false,
    autoQueueBlogTopics: d.autoQueueBlogTopics !== false,
    requireApprovalForSocial: d.requireApprovalForSocial !== false,
    requireApprovalForWhatsapp: d.requireApprovalForWhatsapp !== false,
    festivalCampaignsEnabled: d.festivalCampaignsEnabled !== false,
    competitorScanEnabled: d.competitorScanEnabled !== false,
  };
}

export async function saveMarketingEngineSettings(
  patch: Partial<MarketingEngineSettings>,
): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin not configured");
  await db.doc(DOC).set(patch, { merge: true });
}
