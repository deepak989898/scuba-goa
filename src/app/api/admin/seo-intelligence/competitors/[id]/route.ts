import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  deleteCompetitor,
  updateCompetitor,
} from "@/lib/seo-intelligence/competitors";
import type { SeoIntelCompetitor } from "@/lib/seo-intelligence/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { id } = await ctx.params;
  try {
    const body = (await req.json()) as Partial<SeoIntelCompetitor>;
    // Never allow domain identity rewrite via patch
    delete body.id;
    delete body.domain;
    delete body.canonicalDomain;
    const result = await updateCompetitor(id, body, auth.uid);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ competitor: result.competitor });
  } catch (e) {
    console.error("[seo-intelligence/competitors PATCH]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Update failed" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { id } = await ctx.params;
  const result = await deleteCompetitor(id, auth.uid);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
