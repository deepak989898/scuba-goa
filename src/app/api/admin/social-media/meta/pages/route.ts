import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { listMetaPages } from "@/lib/social-media/meta/client";
import { getMetaSettings } from "@/lib/social-media/meta/settings";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const meta = await getMetaSettings();
  if (!meta.userAccessToken) {
    return NextResponse.json(
      { error: "Connect Facebook first" },
      { status: 400 },
    );
  }

  const pages = await listMetaPages(meta.userAccessToken);
  return NextResponse.json({ pages });
}
