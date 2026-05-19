import { getAdminDb } from "@/lib/firebase-admin";

const SETTINGS_DOC = "blogAutomation/googleBusiness";

export type GoogleBusinessSettings = {
  enabled: boolean;
  /** OAuth refresh token (stored after Connect flow). */
  refreshToken: string;
  accountId: string;
  locationId: string;
  locationTitle: string;
  connectedAt: string | null;
  lastPostAt: string | null;
  lastPostSlug: string | null;
  lastPostError: string | null;
  updatedAt: string;
};

export const DEFAULT_GOOGLE_BUSINESS_SETTINGS: GoogleBusinessSettings = {
  enabled: false,
  refreshToken: "",
  accountId: "",
  locationId: "",
  locationTitle: "",
  connectedAt: null,
  lastPostAt: null,
  lastPostSlug: null,
  lastPostError: null,
  updatedAt: new Date().toISOString(),
};

export function parseGoogleBusinessSettings(
  data: Record<string, unknown> | undefined,
): GoogleBusinessSettings {
  if (!data) return { ...DEFAULT_GOOGLE_BUSINESS_SETTINGS };
  return {
    enabled: data.enabled === true,
    refreshToken: String(data.refreshToken ?? "").trim(),
    accountId: String(data.accountId ?? "").trim(),
    locationId: String(data.locationId ?? "").trim(),
    locationTitle: String(data.locationTitle ?? "").trim(),
    connectedAt: data.connectedAt != null ? String(data.connectedAt) : null,
    lastPostAt: data.lastPostAt != null ? String(data.lastPostAt) : null,
    lastPostSlug: data.lastPostSlug != null ? String(data.lastPostSlug) : null,
    lastPostError: data.lastPostError != null ? String(data.lastPostError) : null,
    updatedAt: String(data.updatedAt ?? new Date().toISOString()),
  };
}

/** Public-safe view (no refresh token). */
export function googleBusinessSettingsPublic(
  s: GoogleBusinessSettings,
): Omit<GoogleBusinessSettings, "refreshToken"> & {
  hasRefreshToken: boolean;
  configured: boolean;
} {
  const hasRefreshToken = Boolean(
    s.refreshToken || process.env.GOOGLE_BUSINESS_REFRESH_TOKEN?.trim(),
  );
  const configured = Boolean(
    hasRefreshToken && s.accountId && s.locationId,
  );
  return {
    enabled: s.enabled,
    accountId: s.accountId,
    locationId: s.locationId,
    locationTitle: s.locationTitle,
    connectedAt: s.connectedAt,
    lastPostAt: s.lastPostAt,
    lastPostSlug: s.lastPostSlug,
    lastPostError: s.lastPostError,
    updatedAt: s.updatedAt,
    hasRefreshToken,
    configured,
  };
}

export async function getGoogleBusinessSettings(): Promise<GoogleBusinessSettings> {
  const db = getAdminDb();
  if (!db) return { ...DEFAULT_GOOGLE_BUSINESS_SETTINGS };
  const ref = await db.doc(SETTINGS_DOC).get();
  if (!ref.exists) return { ...DEFAULT_GOOGLE_BUSINESS_SETTINGS };
  return parseGoogleBusinessSettings(ref.data() as Record<string, unknown>);
}

export async function saveGoogleBusinessSettings(
  patch: Partial<GoogleBusinessSettings>,
): Promise<GoogleBusinessSettings> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin not configured");
  const current = await getGoogleBusinessSettings();
  const next: GoogleBusinessSettings = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await db.doc(SETTINGS_DOC).set(next, { merge: true });
  return next;
}
