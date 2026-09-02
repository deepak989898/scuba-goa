import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  listChatDaysSummary,
  listChatSessionsForDate,
} from "@/lib/chat-booking-agent/session-log-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const date = new URL(req.url).searchParams.get("date")?.trim();

  try {
    if (date) {
      const sessions = await listChatSessionsForDate(date);
      return NextResponse.json({ date, sessions });
    }
    const days = await listChatDaysSummary(90);
    return NextResponse.json({ days });
  } catch (e) {
    console.error("[admin/chat-logs]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load chat logs" },
      { status: 500 },
    );
  }
}
