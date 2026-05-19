import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  getBlogAutomationSettings,
  saveBlogAutomationSettings,
} from "@/lib/blog-automation/settings";
import type { BlogLanguage } from "@/lib/blog-firestore";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const settings = await getBlogAutomationSettings();
  return NextResponse.json({ settings });
}

export async function PATCH(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch: Parameters<typeof saveBlogAutomationSettings>[0] = {};
  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
  if (body.postsPerDay != null) patch.postsPerDay = Number(body.postsPerDay);
  if (body.publishHourIst != null) {
    patch.publishHourIst = Number(body.publishHourIst);
  }
  if (body.defaultLanguage != null) {
    const l = String(body.defaultLanguage);
    if (l === "en" || l === "hi" || l === "hinglish") {
      patch.defaultLanguage = l as BlogLanguage;
    }
  }
  if (Array.isArray(body.languageRotation)) {
    const rot = body.languageRotation
      .map((x) => String(x))
      .filter((x): x is BlogLanguage => x === "en" || x === "hi" || x === "hinglish");
    if (rot.length) patch.languageRotation = rot;
  }

  const settings = await saveBlogAutomationSettings(patch);
  return NextResponse.json({ settings });
}
