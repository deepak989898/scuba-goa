import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "Firebase Admin not configured" }, { status: 500 });

  let body: { actionId?: string } = {};
  try {
    body = await req.json().catch(() => ({}));
  } catch {
    body = {};
  }

  const actionId = body.actionId?.trim();
  if (!actionId) return NextResponse.json({ error: "actionId required" }, { status: 400 });

  try {
    await db
      .collection("businessAgentActions")
      .doc(actionId)
      .set(
        {
          status: "rejected",
          rejectedAt: new Date().toISOString(),
        },
        { merge: true },
      );
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

