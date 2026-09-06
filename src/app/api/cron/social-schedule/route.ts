import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron-auth";
import { runSocialScheduleDueBatch } from "@/lib/social-media/schedule";
import { scheduleCronTask } from "@/lib/cron-runner";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Cron — posts queued items for all IST time slots due today (runs once daily on Vercel Hobby). */
export async function GET(req: Request) {
  if (!verifyCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  scheduleCronTask("social-schedule", async () => {
    const result = await runSocialScheduleDueBatch();
    if (!result.ok) {
      throw new Error(result.summary ?? "Social schedule failed");
    }
    return result;
  });

  return NextResponse.json(
    { ok: true, accepted: true, task: "social-schedule" },
    { status: 202 },
  );
}
