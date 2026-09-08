import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { tryParseServiceAccountJson } from "@/lib/parse-service-account-json";

const BOOKSCUBA_APP_NAME = "bookscuba-admin";
let adminApp: App | null = null;
/** Last failure reason for diagnostics (no secrets). */
let lastAdminInitMessage: string | null = null;

export function getFirebaseAdminInitMessage(): string | null {
  return lastAdminInitMessage;
}

export function getAdminApp(): App | null {
  if (adminApp) return adminApp;
  lastAdminInitMessage = null;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (raw === undefined || raw.trim() === "") {
    lastAdminInitMessage =
      "FIREBASE_SERVICE_ACCOUNT_KEY is unset or empty. Add it to .env.local and restart npm run dev.";
    return null;
  }

  const parsed = tryParseServiceAccountJson(raw);
  if (!parsed.ok) {
    lastAdminInitMessage = parsed.message;
    if (process.env.NODE_ENV === "development") {
      console.error("[firebase-admin]", parsed.message);
    }
    return null;
  }

  try {
    const named = getApps().find((a) => a.name === BOOKSCUBA_APP_NAME);
    if (named) {
      adminApp = named;
      return adminApp;
    }
    // Legacy: default app from older deploys
    const legacy = getApps().find((a) => a.name === "[DEFAULT]");
    if (legacy) {
      adminApp = legacy;
      return adminApp;
    }
    adminApp = initializeApp(
      {
        credential: cert({
          projectId: parsed.projectId,
          clientEmail: parsed.clientEmail,
          privateKey: parsed.privateKey.replace(/\\n/g, "\n"),
        }),
      },
      BOOKSCUBA_APP_NAME,
    );
    return adminApp;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    lastAdminInitMessage = `Firebase Admin init failed: ${msg}`;
    if (process.env.NODE_ENV === "development") {
      console.error("[firebase-admin]", lastAdminInitMessage);
    }
    return null;
  }
}

export function getAdminDb() {
  const app = getAdminApp();
  if (!app) return null;
  const db = getFirestore(app);
  // Analytics payloads omit empty optional fields; this avoids write failures
  // if any undefined slips through (geo / referrer / UTM).
  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch {
    /* settings may only be called once per app */
  }
  return db;
}
