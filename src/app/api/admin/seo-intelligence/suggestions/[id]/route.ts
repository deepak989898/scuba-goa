import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { decideSuggestion } from "@/lib/seo-intelligence/apply-suggestion";
import { updateSuggestionFields } from "@/lib/seo-intelligence/generate-suggestions";
import { getSuggestion } from "@/lib/seo-intelligence/suggestions-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { id } = await ctx.params;
  const suggestion = await getSuggestion(id);
  if (!suggestion) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ suggestion });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { id } = await ctx.params;
  try {
    const body = (await req.json()) as {
      decision?: "approve" | "reject" | "defer";
      rejectionReason?: string;
      proposedValue?: string;
      proposedPatch?: Record<string, unknown> | null;
      adminNotes?: string;
      priority?: string;
    };

    if (body.decision) {
      const suggestion = await decideSuggestion({
        id,
        decision: body.decision,
        rejectionReason: body.rejectionReason,
        actor: auth.uid,
      });
      return NextResponse.json({ suggestion });
    }

    const suggestion = await updateSuggestionFields(
      id,
      {
        proposedValue: body.proposedValue,
        proposedPatch: body.proposedPatch,
        adminNotes: body.adminNotes,
        priority: body.priority as never,
      },
      auth.uid,
    );
    return NextResponse.json({ suggestion });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Update failed" },
      { status: 400 },
    );
  }
}
