import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { runKeywordGeneration } from "@/lib/seo-blog-center/pipeline";
import { listKeywords } from "@/lib/seo-blog-center/store";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(req: Request) {
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
}

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const result = await runKeywordGeneration(auth.uid);
  return NextResponse.json({ ok: true, ...result });
}
