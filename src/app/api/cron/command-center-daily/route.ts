import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron-auth";
import { runCommandCenterPipeline } from "@/lib/command-center/pipeline";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: Request) {
  if (!verifyCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runCommandCenterPipeline();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    dateIst: result.dateIst,
    message: `Command center ran for ${result.dateIst}`,
  });
}
