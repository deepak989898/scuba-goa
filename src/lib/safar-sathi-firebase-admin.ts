/**
 * Safar Sathi Firebase (separate project) — read-only `goaHotels` catalog for Book Scuba Goa.
 *
 * Set on Vercel:
 *   SAFAR_SATHI_FIREBASE_SERVICE_ACCOUNT_KEY = full service account JSON from Safar Sathi project
 *
 * Book Scuba Goa bookings/admin still use FIREBASE_SERVICE_ACCOUNT_KEY (this project's Firebase).
 */
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { tryParseServiceAccountJson } from "@/lib/parse-service-account-json";

const SAFAR_SATHI_APP_NAME = "safar-sathi-catalog";
let lastInitMessage: string | null = null;

export function getSafarSathiAdminInitMessage(): string | null {
  return lastInitMessage;
}

export function getSafarSathiAdminApp(): App | null {
  lastInitMessage = null;

  const existing = getApps().find((a) => a.name === SAFAR_SATHI_APP_NAME);
  if (existing) return existing;

  const raw = process.env.SAFAR_SATHI_FIREBASE_SERVICE_ACCOUNT_KEY?.trim();
  if (!raw) {
    lastInitMessage =
      "SAFAR_SATHI_FIREBASE_SERVICE_ACCOUNT_KEY is unset. Add Safar Sathi service account JSON on Vercel.";
    return null;
  }

  const parsed = tryParseServiceAccountJson(raw);
  if (!parsed.ok) {
    lastInitMessage = parsed.message;
    return null;
  }

  try {
    return initializeApp(
      {
        credential: cert({
          projectId: parsed.projectId,
          clientEmail: parsed.clientEmail,
          privateKey: parsed.privateKey.replace(/\\n/g, "\n"),
        }),
      },
      SAFAR_SATHI_APP_NAME,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    lastInitMessage = `Safar Sathi Admin init failed: ${msg}`;
    return null;
  }
}

/** Firestore for Safar Sathi project — `goaHotels` collection only. */
export function getSafarSathiAdminDb(): Firestore | null {
  const app = getSafarSathiAdminApp();
  if (!app) return null;
  try {
    return getFirestore(app);
  } catch {
    return null;
  }
}

/** Project id from Safar Sathi service account (for diagnostics). */
export function getSafarSathiProjectId(): string | null {
  const raw = process.env.SAFAR_SATHI_FIREBASE_SERVICE_ACCOUNT_KEY?.trim();
  if (!raw) return null;
  const parsed = tryParseServiceAccountJson(raw);
  return parsed.ok ? parsed.projectId : null;
}
