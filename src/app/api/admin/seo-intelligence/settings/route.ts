import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  getSeoIntelSettings,
  saveSeoIntelSettings,
} from "@/lib/seo-intelligence/settings";
import type { SeoIntelAgentSettings } from "@/lib/seo-intelligence/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const settings = await getSeoIntelSettings();
  return NextResponse.json({ settings });
}

export async function PATCH(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  try {
    const body = (await req.json()) as Partial<SeoIntelAgentSettings>;
    // Never allow client to wipe disclaimer
    delete (body as { disclaimer?: unknown }).disclaimer;
    const settings = await saveSeoIntelSettings(body);
    return NextResponse.json({ settings });
  } catch (e) {
    console.error("[seo-intelligence/settings]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Save failed" },
      { status: 500 },
    );
  }
}
