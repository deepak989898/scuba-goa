import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { formatUtcInIst } from "@/lib/blog-automation/schedule-ist";
import {
  getSocialScheduleSettings,
  getScheduleSlotStatus,
  runSocialScheduleOnce,
  saveSocialScheduleSettings,
  normalizePostsPerDay,
  normalizeSocialTimeSlots,
  type SocialQueueItem,
  type SocialScheduleSettings,
} from "@/lib/social-media/schedule";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const schedule = await getSocialScheduleSettings();
  const queue = [...schedule.queue].sort((a, b) => a.order - b.order);
  const nextItem =
    queue.length > 0 ? queue[schedule.cursor % queue.length] : null;
  const slotStatus = getScheduleSlotStatus(schedule);

  return NextResponse.json({
    schedule,
    nextItem,
    slotStatus,
    nextRunAtLabel: formatUtcInIst(schedule.nextRunAt, "long"),
    lastRunAtLabel: formatUtcInIst(schedule.lastRunAt, "long"),
  });
}

export async function PATCH(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await req.json().catch(() => ({}))) as Partial<SocialScheduleSettings> & {
    queue?: SocialQueueItem[];
  };

  const patch: Partial<SocialScheduleSettings> = {};

  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
  if (body.frequency === "daily" || body.frequency === "weekly" || body.frequency === "monthly") {
    patch.frequency = body.frequency;
  }
  if (body.postsPerDay != null) {
    patch.postsPerDay = normalizePostsPerDay(body.postsPerDay);
  }
  if (Array.isArray(body.timeSlotsIst)) {
    patch.timeSlotsIst = normalizeSocialTimeSlots(
      patch.postsPerDay ?? (await getSocialScheduleSettings()).postsPerDay,
      body.timeSlotsIst,
    );
  }
  if (body.timeIst != null) patch.timeIst = String(body.timeIst).slice(0, 5);
  if (body.dayOfWeek != null) patch.dayOfWeek = Number(body.dayOfWeek);
  if (body.dayOfMonth != null) patch.dayOfMonth = Number(body.dayOfMonth);
  if (body.platforms && typeof body.platforms === "object") {
    patch.platforms = {
      googleBusiness: body.platforms.googleBusiness === true,
      facebook: body.platforms.facebook === true,
      instagram: body.platforms.instagram === true,
      youtube: body.platforms.youtube === true,
    };
  }
  if (Array.isArray(body.queue)) {
    patch.queue = body.queue.map((item, i) => ({
      id: String(item.id ?? `q_${Date.now()}_${i}`),
      contentType: item.contentType,
      refId: String(item.refId ?? "").trim(),
      title: String(item.title ?? "").slice(0, 200),
      order: Number(item.order ?? i),
      addedAt: String(item.addedAt ?? new Date().toISOString()),
      lastPostedAt: item.lastPostedAt ? String(item.lastPostedAt) : undefined,
      postCount: Math.max(0, Number(item.postCount ?? 0)),
    }));
    patch.cursor = 0;
  }

  const next = await saveSocialScheduleSettings(patch);
  return NextResponse.json({ ok: true, schedule: next });
}

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await req.json().catch(() => ({}))) as { force?: boolean };
  const result = await runSocialScheduleOnce({ force: body.force === true });
  if (!result.ok && !result.skipped) {
    return NextResponse.json({ error: result.error ?? "Run failed", result }, { status: 500 });
  }
  return NextResponse.json({ ok: true, result });
}
