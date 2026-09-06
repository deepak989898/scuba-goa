import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron-auth";
import { runSocialScheduleOnce } from "@/lib/social-media/schedule";
import { scheduleCronTask } from "@/lib/cron-runner";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Cron — posts next queued item when an IST time slot is due (checks every 30 min). */
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
