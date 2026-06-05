import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { firestoreDocToJson } from "@/lib/firestore-json";

export const runtime = "nodejs";

/** Doc IDs are IST dates (YYYY-MM-DD) — sort newest first without a Firestore index. */
function latestDocs(
  docs: QueryDocumentSnapshot[],
  limit: number,
): Record<string, unknown>[] {
  return [...docs]
    .sort((a, b) => b.id.localeCompare(a.id))
    .slice(0, limit)
    .map((d) => firestoreDocToJson(d.id, d.data()));
}

export async function GET(req: Request) {
  try {
    const auth = await authenticateAdminRequest(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ error: "Firebase Admin not configured" }, { status: 500 });
    }

    const url = new URL(req.url);
    const days = Math.min(30, Math.max(1, Number(url.searchParams.get("days") ?? 14)));

    const [dailySnap, reportsSnap] = await Promise.all([
      db.collection("conversionOptDaily").get(),
      db.collection("conversionOptReports").get(),
    ]);

    return NextResponse.json({
      daily: latestDocs(dailySnap.docs, days),
      reports: latestDocs(reportsSnap.docs, days),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[conversion-opt dashboard]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
