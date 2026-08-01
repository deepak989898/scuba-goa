import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { discoverKeywords } from "@/lib/seo-intelligence/discover-keywords";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  try {
    const body = (await req.json().catch(() => ({}))) as {
      includeSuggest?: boolean;
      maxUpserts?: number;
    };
    const result = await discoverKeywords({
      actor: auth.uid,
      includeSuggest: body.includeSuggest !== false,
      maxUpserts: Math.min(300, Math.max(20, Number(body.maxUpserts) || 200)),
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error("[seo-intelligence/keywords/discover]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Discovery failed" },
      { status: 500 },
    );
  }
}
