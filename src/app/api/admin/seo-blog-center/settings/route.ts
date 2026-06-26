import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { updateSeoBlogSettings } from "@/lib/seo-blog-center/pipeline";
import { getSeoBlogSettings } from "@/lib/seo-blog-center/store";
import type { SeoBlogCenterSettings } from "@/lib/seo-blog-center/types";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const settings = await getSeoBlogSettings();
  return NextResponse.json({ settings });
}

export async function PATCH(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: Partial<SeoBlogCenterSettings>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const settings = await updateSeoBlogSettings(body);
  return NextResponse.json({ ok: true, settings });
}
