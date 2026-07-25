import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { getSeoSettings, saveSeoSettings } from "@/lib/gsc-indexing-agent";
import type { AgentMode } from "@/lib/gsc-indexing-agent";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  return NextResponse.json({ settings: await getSeoSettings() });
}

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: {
    agentMode?: AgentMode;
    paused?: boolean;
    propertyUri?: string;
    inspectionDailyQuota?: number;
    sitemapSubmitDebounceMinutes?: number;
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch: Parameters<typeof saveSeoSettings>[0] = {};
  if (body.agentMode && ["monitor_only", "approval_required", "safe_auto_fix"].includes(body.agentMode)) {
    patch.agentMode = body.agentMode;
  }
  if (typeof body.paused === "boolean") patch.paused = body.paused;
  if (typeof body.propertyUri === "string" && body.propertyUri.trim()) {
    const p = body.propertyUri.trim();
    patch.propertyUri = p.endsWith("/") ? p : `${p}/`;
  }
  if (typeof body.inspectionDailyQuota === "number") {
    patch.inspectionDailyQuota = Math.max(1, Math.min(200, Math.round(body.inspectionDailyQuota)));
  }
  if (typeof body.sitemapSubmitDebounceMinutes === "number") {
    patch.sitemapSubmitDebounceMinutes = Math.max(
      60,
      Math.min(10080, Math.round(body.sitemapSubmitDebounceMinutes)),
    );
  }

  const settings = await saveSeoSettings(patch);
  return NextResponse.json({ ok: true, settings });
}
