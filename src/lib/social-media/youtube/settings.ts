import { getAdminDb } from "@/lib/firebase-admin";

const SETTINGS_DOC = "socialMedia/youtube";

export type YouTubeSocialSettings = {
  refreshToken: string;
  channelId: string;
  channelTitle: string;
  connectedAt: string | null;
  lastPostAt: string | null;
  lastPostError: string | null;
  updatedAt: string;
};

export const DEFAULT_YOUTUBE_SETTINGS: YouTubeSocialSettings = {
  refreshToken: "",
  channelId: "",
  channelTitle: "",
  connectedAt: null,
  lastPostAt: null,
  lastPostError: null,
  updatedAt: new Date().toISOString(),
};

export function parseYouTubeSettings(
  data: Record<string, unknown> | undefined,
): YouTubeSocialSettings {
  if (!data) return { ...DEFAULT_YOUTUBE_SETTINGS };
  return {
    refreshToken: String(data.refreshToken ?? "").trim(),
    channelId: String(data.channelId ?? "").trim(),
    channelTitle: String(data.channelTitle ?? "").trim(),
    connectedAt: data.connectedAt != null ? String(data.connectedAt) : null,
    lastPostAt: data.lastPostAt != null ? String(data.lastPostAt) : null,
    lastPostError: data.lastPostError != null ? String(data.lastPostError) : null,
    updatedAt: String(data.updatedAt ?? new Date().toISOString()),
  };
}

export function youtubeSettingsPublic(s: YouTubeSocialSettings) {
  return {
    connected: Boolean(s.refreshToken && s.channelId),
    channelId: s.channelId,
    channelTitle: s.channelTitle,
    connectedAt: s.connectedAt,
    lastPostAt: s.lastPostAt,
    lastPostError: s.lastPostError,
    updatedAt: s.updatedAt,
  };
}

export async function getYouTubeSettings(): Promise<YouTubeSocialSettings> {
  const db = getAdminDb();
  if (!db) return { ...DEFAULT_YOUTUBE_SETTINGS };
  const snap = await db.doc(SETTINGS_DOC).get();
  if (!snap.exists) return { ...DEFAULT_YOUTUBE_SETTINGS };
  return parseYouTubeSettings(snap.data() as Record<string, unknown>);
}

export async function saveYouTubeSettings(
  patch: Partial<YouTubeSocialSettings>,
): Promise<YouTubeSocialSettings> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin not configured");
  const current = await getYouTubeSettings();
  const next = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await db.doc(SETTINGS_DOC).set(next, { merge: true });
  return next;
}
