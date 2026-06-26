import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { getFirebaseAdminInitMessage } from "@/lib/firebase-admin";
import { runKeywordGeneration } from "@/lib/seo-blog-center/pipeline";
import { listKeywords } from "@/lib/seo-blog-center/store";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(req: Request) {
  try {
    const auth = await authenticateAdminRequest(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const url = new URL(req.url);
    const status = url.searchParams.get("status") as
      | "pending"
      | "approved"
      | "rejected"
      | null;

    const keywords = await listKeywords(status ?? undefined, 300);
    return NextResponse.json({ keywords });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const hint = getFirebaseAdminInitMessage();
    console.error("[seo-blog-center/keywords GET]", e);
    return NextResponse.json(
      { error: hint ? `${msg} (${hint})` : msg },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const auth = await authenticateAdminRequest(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const result = await runKeywordGeneration(auth.uid);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const hint = getFirebaseAdminInitMessage();
    console.error("[seo-blog-center/keywords POST]", e);
    return NextResponse.json(
      { error: hint ? `${msg} (${hint})` : msg },
      { status: 500 },
    );
  }
}
