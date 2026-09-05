import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { saveYouTubeSettings } from "@/lib/social-media/youtube/settings";

export const runtime = "nodejs";

export async function DELETE(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  await saveYouTubeSettings({
    refreshToken: "",
    channelId: "",
    channelTitle: "",
    connectedAt: null,
    lastPostAt: null,
    lastPostError: null,
  });

  return NextResponse.json({ ok: true });
}
