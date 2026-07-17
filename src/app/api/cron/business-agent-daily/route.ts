import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron-auth";
import { runBusinessAgentDaily } from "@/lib/business-agent/pipeline-daily";
import { scheduleCronTask } from "@/lib/cron-runner";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(req: Request) {
  if (!verifyCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  scheduleCronTask("business-agent-daily", async () => {
    const result = await runBusinessAgentDaily();
    if (!result.ok) throw new Error(result.error ?? "Business agent failed");
    return result;
  });
  return NextResponse.json(
    { ok: true, accepted: true, task: "business-agent-daily" },
    { status: 202 },
  );
}

