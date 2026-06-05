import { FieldPath } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { firestoreDocToJson } from "@/lib/firestore-json";

export const runtime = "nodejs";

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
      db
        .collection("conversionOptDaily")
        .orderBy(FieldPath.documentId(), "desc")
        .limit(days)
        .get(),
      db
        .collection("conversionOptReports")
        .orderBy(FieldPath.documentId(), "desc")
        .limit(days)
        .get(),
    ]);

    const daily = dailySnap.docs.map((d) => firestoreDocToJson(d.id, d.data()));
    const reports = reportsSnap.docs.map((d) => firestoreDocToJson(d.id, d.data()));

    return NextResponse.json({ daily, reports });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[conversion-opt dashboard]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
