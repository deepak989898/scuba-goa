import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron-auth";
import { runCommandCenterPipeline } from "@/lib/command-center/pipeline";
import { scheduleCronTask } from "@/lib/cron-runner";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: Request) {
  if (!verifyCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  scheduleCronTask("command-center-daily", async () => {
    const result = await runCommandCenterPipeline();
    if (!result.ok) throw new Error(result.error ?? "Command center failed");
    return result;
  });
  return NextResponse.json(
    { ok: true, accepted: true, task: "command-center-daily" },
    { status: 202 },
  );
}
