import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  approveBlogDraft,
  generateBlogFromKeyword,
  publishBlogDraft,
} from "@/lib/seo-blog-center/pipeline";
import { listDrafts } from "@/lib/seo-blog-center/store";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const drafts = await listDrafts(
    status as import("@/lib/seo-blog-center/types").BlogDraftStatus | undefined,
    100,
  );
  return NextResponse.json({ drafts });
}

export async function POST(req: Request) {
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

  const draft = await generateBlogFromKeyword(keywordId, auth.uid);
  return NextResponse.json({ ok: true, draft });
}
