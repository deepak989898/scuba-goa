import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { seedCatalogIfEmpty } from "@/lib/seed-default-catalog";

/**
 * Seeds `packages` and/or `services` from code defaults when each collection
 * is completely empty. Requires FIREBASE_SERVICE_ACCOUNT_KEY on the server.
 * Safe to call repeatedly (no-op if documents already exist).
 */
export async function POST() {
  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "FIREBASE_SERVICE_ACCOUNT_KEY is not configured; cannot seed Firestore from the server.",
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
      { ok: false, error: e instanceof Error ? e.message : "Seed failed" },
      { status: 500 }
    );
  }
}
