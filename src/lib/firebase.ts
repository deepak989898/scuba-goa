import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

function normalizeStorageBucket(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  // Accept common formats:
  // - "my-project.appspot.com"
  // - "gs://my-project.appspot.com"
  // - "https://storage.googleapis.com/my-project.appspot.com"
  let v = trimmed.replace(/^gs:\/\//i, "");
  v = v.replace(/^https?:\/\/storage\.googleapis\.com\//i, "");
  v = v.replace(/^https?:\/\/firebasestorage\.googleapis\.com\/v0\/b\//i, "");
  v = v.replace(/\/.*$/, "");
  return v || undefined;
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: normalizeStorageBucket(
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  ),
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

function getClientApp(): FirebaseApp | null {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) return null;
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export function getFirebaseApp(): FirebaseApp | null {
  return getClientApp();
}

export function getDb(): Firestore | null {
  const app = getClientApp();
  return app ? getFirestore(app) : null;
}

export function getFirebaseAuth(): Auth | null {
  const app = getClientApp();
  return app ? getAuth(app) : null;
}

export function getFirebaseStorageClient(): FirebaseStorage | null {
  const app = getClientApp();
  return app ? getStorage(app) : null;
}
