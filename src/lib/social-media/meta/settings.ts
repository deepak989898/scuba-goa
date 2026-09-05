import { getAdminDb } from "@/lib/firebase-admin";

const SETTINGS_DOC = "socialMedia/meta";

export type MetaSocialSettings = {
  userAccessToken: string;
  tokenExpiresAt: string | null;
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  instagramBusinessId: string;
  instagramUsername: string;
  connectedAt: string | null;
  lastPostAt: string | null;
  lastPostError: string | null;
  updatedAt: string;
};

export const DEFAULT_META_SETTINGS: MetaSocialSettings = {
  userAccessToken: "",
  tokenExpiresAt: null,
  pageId: "",
  pageName: "",
  pageAccessToken: "",
  instagramBusinessId: "",
  instagramUsername: "",
  connectedAt: null,
  lastPostAt: null,
  lastPostError: null,
  updatedAt: new Date().toISOString(),
};

export function parseMetaSettings(
  data: Record<string, unknown> | undefined,
): MetaSocialSettings {
  if (!data) return { ...DEFAULT_META_SETTINGS };
  return {
    userAccessToken: String(data.userAccessToken ?? "").trim(),
    tokenExpiresAt: data.tokenExpiresAt != null ? String(data.tokenExpiresAt) : null,
    pageId: String(data.pageId ?? "").trim(),
    pageName: String(data.pageName ?? "").trim(),
    pageAccessToken: String(data.pageAccessToken ?? "").trim(),
    instagramBusinessId: String(data.instagramBusinessId ?? "").trim(),
    instagramUsername: String(data.instagramUsername ?? "").trim(),
    connectedAt: data.connectedAt != null ? String(data.connectedAt) : null,
    lastPostAt: data.lastPostAt != null ? String(data.lastPostAt) : null,
    lastPostError: data.lastPostError != null ? String(data.lastPostError) : null,
    updatedAt: String(data.updatedAt ?? new Date().toISOString()),
  };
}

export function metaSettingsPublic(s: MetaSocialSettings) {
  return {
    connected: Boolean(s.pageAccessToken && s.pageId),
    pageId: s.pageId,
    pageName: s.pageName,
    instagramConnected: Boolean(s.instagramBusinessId),
    instagramUsername: s.instagramUsername,
    connectedAt: s.connectedAt,
    lastPostAt: s.lastPostAt,
    lastPostError: s.lastPostError,
    updatedAt: s.updatedAt,
  };
}

export async function getMetaSettings(): Promise<MetaSocialSettings> {
  const db = getAdminDb();
  if (!db) return { ...DEFAULT_META_SETTINGS };
  const snap = await db.doc(SETTINGS_DOC).get();
  if (!snap.exists) return { ...DEFAULT_META_SETTINGS };
  return parseMetaSettings(snap.data() as Record<string, unknown>);
}

export async function saveMetaSettings(
  patch: Partial<MetaSocialSettings>,
): Promise<MetaSocialSettings> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin not configured");
  const current = await getMetaSettings();
  const next = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await db.doc(SETTINGS_DOC).set(next, { merge: true });
  return next;
}
