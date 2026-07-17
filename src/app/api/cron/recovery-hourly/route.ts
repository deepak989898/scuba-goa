import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron-auth";
import { runRecoveryAgentPipeline } from "@/lib/recovery-agent/pipeline";
import { scheduleCronTask } from "@/lib/cron-runner";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(req: Request) {
  if (!verifyCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  scheduleCronTask("recovery-hourly", async () => {
    const result = await runRecoveryAgentPipeline();
    if (!result.ok) {
      throw new Error(result.errors.join("; ") || "Recovery agent failed");
    }
    return result;
  });
  return NextResponse.json(
    { ok: true, accepted: true, task: "recovery-hourly" },
    { status: 202 },
  );
}
