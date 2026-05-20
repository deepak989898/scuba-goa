import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  getGoogleBusinessSettings,
  googleBusinessSettingsPublic,
  saveGoogleBusinessSettings,
} from "@/lib/google-business/settings";

export const runtime = "nodejs";

/** Accepts raw numeric IDs or resource names like `accounts/123/locations/456`. */
function normalizeGoogleBusinessIds(accountRaw: string, locationRaw: string): {
  accountId: string;
  locationId: string;
} {
  const a = accountRaw.trim();
  const l = locationRaw.trim();
  const combined =
    l.match(/^accounts\/([^/]+)\/locations\/([^/\s?#]+)/i) ??
    a.match(/^accounts\/([^/]+)\/locations\/([^/\s?#]+)/i);
  if (combined) {
    return { accountId: combined[1], locationId: combined[2] };
  }
  const accountId = a.replace(/^accounts\//i, "").split(/[/?#]/)[0] ?? "";
  const locationId =
    (l.match(/locations\/([^/\s?#]+)/i)?.[1] ?? l)
      .replace(/^locations\//i, "")
      .split(/[/?#]/)[0] ?? "";
  return { accountId, locationId };
}

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
  if (body.accountId != null || body.locationId != null) {
    const current = await getGoogleBusinessSettings();
    const accountIn =
      body.accountId != null ? String(body.accountId) : current.accountId;
    const locationIn =
      body.locationId != null ? String(body.locationId) : current.locationId;
    const { accountId, locationId } = normalizeGoogleBusinessIds(
      accountIn,
      locationIn,
    );
    const fullResource =
      /accounts\/[^/]+\/locations\/[^/\s?#]+/i.test(accountIn) ||
      /accounts\/[^/]+\/locations\/[^/\s?#]+/i.test(locationIn);
    if (fullResource) {
      patch.accountId = accountId;
      patch.locationId = locationId;
    } else {
      if (body.accountId != null) patch.accountId = accountId;
      if (body.locationId != null) patch.locationId = locationId;
    }
  }
  if (body.locationTitle != null) {
    patch.locationTitle = String(body.locationTitle).trim();
  }

  const settings = await saveGoogleBusinessSettings(patch);
  return NextResponse.json({
    settings: googleBusinessSettingsPublic(settings),
  });
}
