import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { generateSuggestions } from "@/lib/seo-intelligence/generate-suggestions";
import { processApprovedSuggestions } from "@/lib/seo-intelligence/apply-suggestion";
import { getSeoIntelSettings } from "@/lib/seo-intelligence/settings";

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
      limitKeywords?: number;
      processAutoApproved?: boolean;
    };
    const result = await generateSuggestions({
      actor: auth.uid,
      limitKeywords: Math.min(60, Math.max(5, Number(body.limitKeywords) || 40)),
    });

    let processed = { applied: 0, failed: 0, errors: [] as string[] };
    const settings = await getSeoIntelSettings();
    if (
      body.processAutoApproved !== false &&
      settings.suggestionAutoApprove &&
      result.autoApproved > 0
    ) {
      processed = await processApprovedSuggestions({
        actor: auth.uid,
        limit: Math.min(settings.dailyChangeLimit, 10),
      });
    }

    return NextResponse.json({ ...result, processed });
  } catch (e) {
    console.error("[seo-intelligence/suggestions/generate]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Generate failed" },
      { status: 500 },
    );
  }
}
