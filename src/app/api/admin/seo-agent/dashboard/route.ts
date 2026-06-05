import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { firestoreDocToJson } from "@/lib/firestore-json";

export const runtime = "nodejs";

function latestDocs(docs: QueryDocumentSnapshot[], limit: number): Record<string, unknown>[] {
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
    const weeks = Math.min(12, Math.max(1, Number(url.searchParams.get("weeks") ?? 8)));

    const [snap, repSnap] = await Promise.all([
      db.collection("seoWeekly").get(),
      db.collection("seoWeeklyReports").get(),
    ]);

    return NextResponse.json({
      weekly: latestDocs(snap.docs, weeks),
      reports: latestDocs(repSnap.docs, weeks),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[seo-agent dashboard]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

