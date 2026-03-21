import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

let adminApp: App | null = null;

export function getAdminApp(): App | null {
  if (adminApp) return adminApp;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) return null;
  try {
    const cred = JSON.parse(raw) as {
      project_id: string;
      client_email: string;
      private_key: string;
    };
    if (getApps().length) {
      adminApp = getApps()[0]!;
      return adminApp;
    }
    adminApp = initializeApp({
      credential: cert({
        projectId: cred.project_id,
        clientEmail: cred.client_email,
        privateKey: cred.private_key.replace(/\\n/g, "\n"),
      }),
    });
    return adminApp;
  } catch {
    return null;
  }
}

export function getAdminDb() {
  const app = getAdminApp();
  return app ? getFirestore(app) : null;
}
