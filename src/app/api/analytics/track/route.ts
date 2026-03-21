import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

const PATH_MAX = 512;
const SESSION_MAX = 128;

export async function POST(req: Request) {
  const db = getAdminDb();
  if (!db) {
    return new NextResponse(null, { status: 204 });
  }

  let body: { path?: string; sessionId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const pathRaw = typeof body.path === "string" ? body.path : "";
  const sessionRaw =
    typeof body.sessionId === "string" ? body.sessionId : "anon";

  if (!pathRaw.startsWith("/") || pathRaw.length > PATH_MAX) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  if (pathRaw.startsWith("/admin") || pathRaw.startsWith("/api")) {
    return new NextResponse(null, { status: 204 });
  }

  const path = pathRaw.slice(0, PATH_MAX);
  const sessionId = sessionRaw.slice(0, SESSION_MAX);

  try {
    await db.collection("pageViews").add({
      path,
      sessionId,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.error("pageViews write failed", e);
    return NextResponse.json({ error: "Track failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
