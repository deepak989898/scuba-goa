import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  approveBlogDraft,
  publishBlogDraft,
} from "@/lib/seo-blog-center/pipeline";
import { getDraftById, saveDraft } from "@/lib/seo-blog-center/store";

export const runtime = "nodejs";
export const maxDuration = 180;

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  let body: { action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action?.trim();
  if (action === "approve") {
    const draft = await approveBlogDraft(id, auth.uid);
    return NextResponse.json({ ok: true, draft });
  }
  if (action === "publish") {
    const draft = await publishBlogDraft(id, auth.uid);
    return NextResponse.json({ ok: true, draft });
  }
  if (action === "reject") {
    const draft = await getDraftById(id);
    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }
    await saveDraft({ ...draft, status: "rejected", updatedAt: new Date().toISOString() });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json(
    { error: "action must be approve, publish, or reject" },
    { status: 400 },
  );
}
