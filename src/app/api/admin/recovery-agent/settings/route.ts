import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  getRecoveryAgentSettings,
  saveRecoveryAgentSettings,
} from "@/lib/recovery-agent/settings";
import type { RecoveryAgentSettings } from "@/lib/recovery-agent/types";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const settings = await getRecoveryAgentSettings();
  return NextResponse.json({ settings });
}

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: Partial<RecoveryAgentSettings> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  await saveRecoveryAgentSettings(body);
  const settings = await getRecoveryAgentSettings();
  return NextResponse.json({ ok: true, settings });
}
