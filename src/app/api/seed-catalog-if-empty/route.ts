import { NextResponse } from "next/server";
import {
  getAdminDb,
  getFirebaseAdminInitMessage,
} from "@/lib/firebase-admin";
import { tryParseServiceAccountJson } from "@/lib/parse-service-account-json";
import { seedCatalogIfEmpty } from "@/lib/seed-default-catalog";

export const dynamic = "force-dynamic";

/**
 * Seeds `packages` and/or `services` from code defaults when each collection
 * is completely empty. Requires FIREBASE_SERVICE_ACCOUNT_KEY on the server.
 * Safe to call repeatedly (no-op if documents already exist).
 */
export async function POST() {
  const db = getAdminDb();
  if (!db) {
    const hint = getFirebaseAdminInitMessage();
    return NextResponse.json(
      {
        ok: false,
        error:
          "Firebase Admin is not available on the server (cannot seed Firestore).",
        hint: hint ?? undefined,
        fix: [
          "Put the full service account JSON on ONE line in .env.local as FIREBASE_SERVICE_ACCOUNT_KEY=",
          "Do not wrap the whole JSON in extra double quotes (that breaks parsing).",
          "In private_key, newlines must be the two characters \\n — not real line breaks.",
          "Restart the dev server after saving .env.local (Ctrl+C then npm run dev).",
        ],
      },
      { status: 503 }
    );
  }
  try {
    const seeded = await seedCatalogIfEmpty(db);
    return NextResponse.json({ ok: true, seeded });
  } catch (e) {
    console.error("seedCatalogIfEmpty failed", e);
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Seed failed",
        hint:
          "If you see permission errors, enable Firestore API for the GCP project and ensure the JSON is for the same project as NEXT_PUBLIC_FIREBASE_PROJECT_ID.",
      },
      { status: 500 }
    );
  }
}

/**
 * Diagnostic: checks env + JSON shape without writing. Open in browser while dev server runs.
 */
export async function GET() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (raw === undefined || raw.trim() === "") {
    return NextResponse.json({
      ok: false,
      envPresent: false,
      message:
        "FIREBASE_SERVICE_ACCOUNT_KEY is not set for this Node process. Use .env.local in the project root and restart npm run dev.",
    });
  }
  const parsed = tryParseServiceAccountJson(raw);
  if (!parsed.ok) {
    return NextResponse.json({
      ok: false,
      envPresent: true,
      jsonValid: false,
      message: parsed.message,
    });
  }
  const db = getAdminDb();
  return NextResponse.json({
    ok: true,
    envPresent: true,
    jsonValid: true,
    adminReady: Boolean(db),
    projectId: parsed.projectId,
    message: db
      ? "Admin SDK initialized. POST /api/seed-catalog-if-empty to seed empty collections."
      : getFirebaseAdminInitMessage() ?? "Admin SDK failed to initialize.",
  });
}
