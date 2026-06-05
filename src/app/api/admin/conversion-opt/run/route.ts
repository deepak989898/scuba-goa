import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { istDateString, istYesterdayString } from "@/lib/ai-analytics/ist";
import { runConversionOptPipeline } from "@/lib/conversion-opt/pipeline";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { dateIst?: string } = {};
  try {
    body = await req.json().catch(() => ({}));
  } catch {
    body = {};
  }

  const dateIst = body.dateIst?.trim() || istYesterdayString();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIst)) {
    return NextResponse.json({ error: "Invalid dateIst" }, { status: 400 });
  }

  const result = await runConversionOptPipeline({ dateIst });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    dateIst: result.dateIst,
    todayIst: istDateString(),
  });
}
