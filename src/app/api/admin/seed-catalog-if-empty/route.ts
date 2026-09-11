import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { seedCatalogIfEmpty } from "@/lib/seed-default-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Seeds `packages` and/or `services` from code defaults when each collection
 * is completely empty. Admin-only. Safe to call repeatedly.
 */
export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { ok: false, error: "Firebase Admin is not available on the server." },
      { status: 503 },
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
      },
      { status: 500 },
    );
  }
}
