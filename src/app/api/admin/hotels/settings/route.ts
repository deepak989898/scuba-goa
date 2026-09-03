import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  getHotelsSiteSettings,
  isHotelsMenuVisible,
  setHotelsMenuVisible,
} from "@/lib/tripjack-hotels/settings";

export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const settings = await getHotelsSiteSettings();
  const websiteMenuVisible = await isHotelsMenuVisible();

  return NextResponse.json({
    websiteMenuVisible,
    settings,
  });
}

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { websiteMenuVisible?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.websiteMenuVisible !== "boolean") {
    return NextResponse.json(
      { error: "websiteMenuVisible (boolean) required" },
      { status: 400 },
    );
  }

  const settings = await setHotelsMenuVisible(body.websiteMenuVisible, auth.uid);

  return NextResponse.json({
    ok: true,
    websiteMenuVisible: settings.websiteMenuVisible,
    settings,
  });
}
