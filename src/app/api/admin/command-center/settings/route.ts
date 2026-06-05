import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  getCommandCenterSettings,
  saveCommandCenterSettings,
} from "@/lib/command-center/settings";
import type { CommandCenterSettings } from "@/lib/command-center/types";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  return NextResponse.json({ settings: await getCommandCenterSettings() });
}

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: Partial<CommandCenterSettings> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  await saveCommandCenterSettings(body);
  return NextResponse.json({ ok: true, settings: await getCommandCenterSettings() });
}
