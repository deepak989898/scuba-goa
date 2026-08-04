import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  getBlogDailyScheduleOverrides,
  getEffectiveDayPlan,
  listIstDatesFromToday,
  saveBlogDailyScheduleOverrides,
  type BlogDayOverride,
} from "@/lib/blog-automation/daily-schedule";
import { getBlogAutomationSettings } from "@/lib/blog-automation/settings";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  try {
    const settings = await getBlogAutomationSettings();
    const overrides = await getBlogDailyScheduleOverrides();
    const merged: Record<string, BlogDayOverride> = {};
    for (const d of listIstDatesFromToday(30)) {
      merged[d] = getEffectiveDayPlan(d, overrides, settings);
    }
    return NextResponse.json({ days: merged, overrides });
  } catch (e) {
    console.error("[admin/blog-daily-schedule GET]", e);
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? `Daily schedule load failed: ${e.message}`
            : "Daily schedule load failed",
      },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  let body: { days?: Record<string, BlogDayOverride> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.days || typeof body.days !== "object") {
    return NextResponse.json({ error: "days object required" }, { status: 400 });
  }
  await saveBlogDailyScheduleOverrides(body.days);
  return NextResponse.json({ ok: true });
}
