import { getAdminDb } from "@/lib/firebase-admin";
import type { SocialPlatform } from "@/lib/social-media/types";

const SETTINGS_DOC = "socialMedia/settings";

export type SocialAutomationFlags = {
  googleBusiness: boolean;
  facebook: boolean;
  instagram: boolean;
  youtube: boolean;
};

export type SocialMediaSettings = {
  automation: SocialAutomationFlags;
  updatedAt: string;
};

export const DEFAULT_SOCIAL_MEDIA_SETTINGS: SocialMediaSettings = {
  automation: {
    googleBusiness: false,
    facebook: false,
    instagram: false,
    youtube: false,
  },
  updatedAt: new Date().toISOString(),
};

export function parseSocialMediaSettings(
  data: Record<string, unknown> | undefined,
): SocialMediaSettings {
  if (!data) return { ...DEFAULT_SOCIAL_MEDIA_SETTINGS };
  const auto = (data.automation ?? {}) as Record<string, unknown>;
  return {
    automation: {
      googleBusiness: auto.googleBusiness === true,
      facebook: auto.facebook === true,
      instagram: auto.instagram === true,
      youtube: auto.youtube === true,
    },
    updatedAt: String(data.updatedAt ?? new Date().toISOString()),
  };
}

export async function getSocialMediaSettings(): Promise<SocialMediaSettings> {
  const db = getAdminDb();
  if (!db) return { ...DEFAULT_SOCIAL_MEDIA_SETTINGS };
  const snap = await db.doc(SETTINGS_DOC).get();
  if (!snap.exists) return { ...DEFAULT_SOCIAL_MEDIA_SETTINGS };
  return parseSocialMediaSettings(snap.data() as Record<string, unknown>);
}

export async function saveSocialMediaSettings(
  patch: Partial<SocialMediaSettings>,
): Promise<SocialMediaSettings> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin not configured");
  const current = await getSocialMediaSettings();
  const next: SocialMediaSettings = {
    ...current,
    ...patch,
    automation: {
      ...current.automation,
      ...(patch.automation ?? {}),
    },
    updatedAt: new Date().toISOString(),
  };
  await db.doc(SETTINGS_DOC).set(next, { merge: true });

  if (patch.automation?.googleBusiness !== undefined) {
    const { saveGoogleBusinessSettings } = await import(
      "@/lib/google-business/settings"
    );
    await saveGoogleBusinessSettings({
      enabled: patch.automation.googleBusiness === true,
    });
  }

  return next;
}

export function enabledPlatforms(
  automation: SocialAutomationFlags,
): SocialPlatform[] {
  const out: SocialPlatform[] = [];
  if (automation.googleBusiness) out.push("googleBusiness");
  if (automation.facebook) out.push("facebook");
  if (automation.instagram) out.push("instagram");
  if (automation.youtube) out.push("youtube");
  return out;
}
