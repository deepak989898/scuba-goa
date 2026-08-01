import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { discoverCompetitors } from "@/lib/seo-intelligence/discover-competitors";

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
      maxKeywords?: number;
    };
    const result = await discoverCompetitors({
      maxKeywords: Math.min(20, Math.max(3, Number(body.maxKeywords) || 10)),
      actor: auth.uid,
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error("[seo-intelligence/competitors/discover]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Discovery failed" },
      { status: 500 },
    );
  }
}
