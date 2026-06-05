import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  getMarketingEngineSettings,
  saveMarketingEngineSettings,
} from "@/lib/marketing-engine/settings";
import type { MarketingEngineSettings } from "@/lib/marketing-engine/types";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const settings = await getMarketingEngineSettings();
  return NextResponse.json({ settings });
}

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: Partial<MarketingEngineSettings> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  await saveMarketingEngineSettings(body);
  const settings = await getMarketingEngineSettings();
  return NextResponse.json({ ok: true, settings });
}
