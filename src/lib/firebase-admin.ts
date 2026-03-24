import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { tryParseServiceAccountJson } from "@/lib/parse-service-account-json";

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
    if (getApps().length) {
      adminApp = getApps()[0]!;
      return adminApp;
    }
    adminApp = initializeApp({
      credential: cert({
        projectId: parsed.projectId,
        clientEmail: parsed.clientEmail,
        privateKey: parsed.privateKey.replace(/\\n/g, "\n"),
      }),
    });
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
  return app ? getFirestore(app) : null;
}
