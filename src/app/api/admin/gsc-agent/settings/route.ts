import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { getSeoSettings, saveSeoSettings } from "@/lib/gsc-indexing-agent";
import {
  runGscScheduledAutomation,
  startGscScheduledAutomation,
  stopGscScheduledAutomation,
} from "@/lib/gsc-indexing-agent/scheduled-automation";
import type { AgentMode } from "@/lib/gsc-indexing-agent";

export const runtime = "nodejs";
export const maxDuration = 300;

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
    action?: string;
    frequency?: string;
    positionThreshold?: number;
    inspectPerRun?: number;
    rankingImproveMax?: number;
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

  if (body.action === "startAutomation") {
    const frequency = String(body.frequency || "daily");
    if (!["daily", "weekly", "monthly"].includes(frequency)) {
      return NextResponse.json({ error: "Invalid frequency" }, { status: 400 });
    }
    const { settings, run } = await startGscScheduledAutomation(
      {
        frequency: frequency as "daily" | "weekly" | "monthly",
        positionThreshold: Number(body.positionThreshold) || 10,
        inspectPerRun: Number(body.inspectPerRun) || 8,
        rankingImproveMax: Number(body.rankingImproveMax) || 5,
      },
      auth.uid || "admin",
    );
    return NextResponse.json({ ok: true, settings, run });
  }

  if (body.action === "stopAutomation") {
    const settings = await stopGscScheduledAutomation();
    return NextResponse.json({ ok: true, settings });
  }

  if (body.action === "runAutomationNow") {
    const run = await runGscScheduledAutomation({
      actorId: auth.uid || "admin",
      force: true,
    });
    return NextResponse.json({ ok: true, run });
  }

  if (body.action === "clearOpenAiImageQueue") {
    const settings = await saveSeoSettings({ automationOpenAiImageQueue: [] });
    return NextResponse.json({ ok: true, settings });
  }

  const settings = await saveSeoSettings(patch);
  return NextResponse.json({ ok: true, settings });
}
