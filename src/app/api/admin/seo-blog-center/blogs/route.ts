import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { getFirebaseAdminInitMessage } from "@/lib/firebase-admin";
import { listDrafts } from "@/lib/seo-blog-center/store";
import type { BlogDraftStatus } from "@/lib/seo-blog-center/types";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function GET(req: Request) {
  try {
    const auth = await authenticateAdminRequest(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const url = new URL(req.url);
    const status = url.searchParams.get("status") as BlogDraftStatus | null;
    const drafts = await listDrafts(status ?? undefined, 100);
    return NextResponse.json({ drafts });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const hint = getFirebaseAdminInitMessage();
    console.error("[seo-blog-center/blogs GET]", e);
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

    let body: { keywordId?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const keywordId = body.keywordId?.trim();
    if (!keywordId) {
      return NextResponse.json({ error: "keywordId required" }, { status: 400 });
    }

    const { generateBlogFromKeyword } = await import("@/lib/seo-blog-center/pipeline");
    const draft = await generateBlogFromKeyword(keywordId, auth.uid);
    return NextResponse.json({ ok: true, draft });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const hint = getFirebaseAdminInitMessage();
    console.error("[seo-blog-center/blogs POST]", e);
    return NextResponse.json(
      { error: hint ? `${msg} (${hint})` : msg },
      { status: 500 },
    );
  }
}
