import { getAdminDb } from "@/lib/firebase-admin";
import { HOTEL_FIRESTORE, type HotelsSiteSettings } from "./types";

const SETTINGS_DOC_ID = "hotels";

function settingsRef() {
  const db = getAdminDb();
  if (!db) return null;
  return db.collection(HOTEL_FIRESTORE.settings).doc(SETTINGS_DOC_ID);
}

/** Default true so existing sites keep Hotels in nav until admin turns it off. */
export function defaultHotelsMenuVisible(): boolean {
  if (process.env.NEXT_PUBLIC_TRIPJACK_HOTELS_ENABLED === "false") return false;
  return true;
}

export async function getHotelsSiteSettings(): Promise<HotelsSiteSettings | null> {
  const ref = settingsRef();
  if (!ref) return null;
  const snap = await ref.get();
  if (!snap.exists) return null;
  return snap.data() as HotelsSiteSettings;
}

export async function isHotelsMenuVisible(): Promise<boolean> {
  const settings = await getHotelsSiteSettings();
  if (settings?.websiteMenuVisible !== undefined) {
    return Boolean(settings.websiteMenuVisible);
  }
  if (settings?.enabled !== undefined) {
    return Boolean(settings.enabled);
  }
  return defaultHotelsMenuVisible();
}

export async function setHotelsMenuVisible(
  visible: boolean,
  updatedBy?: string,
): Promise<HotelsSiteSettings> {
  const ref = settingsRef();
  if (!ref) throw new Error("Database not configured");
  const now = new Date().toISOString();
  const patch: HotelsSiteSettings = {
    websiteMenuVisible: visible,
    enabled: visible,
    updatedAt: now,
    updatedBy,
  };
  await ref.set(patch, { merge: true });
  return { ...patch };
}
