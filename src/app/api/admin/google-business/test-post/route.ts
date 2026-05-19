import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { SITE_URL } from "@/lib/constants";
import { createGoogleBusinessLocalPost } from "@/lib/google-business/client";
import { getGoogleBusinessRuntimeConfig } from "@/lib/google-business/config";
import { saveGoogleBusinessSettings } from "@/lib/google-business/settings";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const runtime = await getGoogleBusinessRuntimeConfig();
  if (!runtime) {
    return NextResponse.json(
      { error: "Google Business not fully configured (OAuth + location)." },
      { status: 400 },
    );
  }

  const site = SITE_URL.replace(/\/$/, "");
  try {
    const result = await createGoogleBusinessLocalPost(runtime, {
      summary: `Test post from ${site} — Book Scuba Goa blog automation. If you see this, Google Business Profile posting is working.`,
      callToActionUrl: site,
      languageCode: "en-IN",
    });
    await saveGoogleBusinessSettings({
      lastPostAt: new Date().toISOString(),
      lastPostError: null,
    });
    return NextResponse.json({ ok: true, postName: result.name });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Test post failed";
    await saveGoogleBusinessSettings({ lastPostError: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
