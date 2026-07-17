import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron-auth";
import { runMarketingEnginePipeline } from "@/lib/marketing-engine/pipeline";
import { scheduleCronTask } from "@/lib/cron-runner";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: Request) {
  if (!verifyCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  scheduleCronTask("marketing-daily", async () => {
    const result = await runMarketingEnginePipeline();
    if (!result.ok) throw new Error(result.error ?? "Marketing engine failed");
    return result;
  });
  return NextResponse.json(
    { ok: true, accepted: true, task: "marketing-daily" },
    { status: 202 },
  );
}
