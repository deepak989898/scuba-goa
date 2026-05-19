import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  getGoogleBusinessSettings,
  googleBusinessSettingsPublic,
  saveGoogleBusinessSettings,
} from "@/lib/google-business/settings";

export const runtime = "nodejs";

export async function PATCH(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch: Parameters<typeof saveGoogleBusinessSettings>[0] = {};
  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
  if (body.accountId != null) patch.accountId = String(body.accountId).trim();
  if (body.locationId != null) patch.locationId = String(body.locationId).trim();
  if (body.locationTitle != null) {
    patch.locationTitle = String(body.locationTitle).trim();
  }

  const settings = await saveGoogleBusinessSettings(patch);
  return NextResponse.json({
    settings: googleBusinessSettingsPublic(settings),
  });
}
