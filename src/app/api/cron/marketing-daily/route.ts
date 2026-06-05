import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron-auth";
import { runMarketingEnginePipeline } from "@/lib/marketing-engine/pipeline";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: Request) {
  if (!verifyCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runMarketingEnginePipeline();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    dateIst: result.dateIst,
    message: `Marketing engine ran for ${result.dateIst}`,
  });
}
