import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  getPricingSettings,
  savePricingSettings,
} from "@/lib/pricing-agent/settings";
import type { PricingSettings } from "@/lib/pricing-agent/types";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const settings = await getPricingSettings();
  return NextResponse.json({ settings });
}

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: Partial<PricingSettings>;
  try {
    body = (await req.json()) as Partial<PricingSettings>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const settings = await savePricingSettings(body, auth.uid);
  return NextResponse.json({ ok: true, settings });
}
