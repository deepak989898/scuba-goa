import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron-auth";
import { runSocialScheduleOnce } from "@/lib/social-media/schedule";
import { scheduleCronTask } from "@/lib/cron-runner";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Daily cron — posts next queued item when schedule is due (IST time + frequency). */
export async function GET(req: Request) {
  if (!verifyCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  scheduleCronTask("social-schedule", async () => {
    const result = await runSocialScheduleOnce();
    if (!result.ok && !result.skipped) {
      throw new Error(result.error ?? "Social schedule failed");
    }
    return result;
  });

  return NextResponse.json(
    { ok: true, accepted: true, task: "social-schedule" },
    { status: 202 },
  );
}
