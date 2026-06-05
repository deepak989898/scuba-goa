import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron-auth";
import { runBusinessAgentDaily } from "@/lib/business-agent/pipeline-daily";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(req: Request) {
  if (!verifyCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runBusinessAgentDaily();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    dateIst: result.dateIst,
    message: `Business ops agent ran for ${result.dateIst}`,
  });
}

