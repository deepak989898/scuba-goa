import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  addCompetitor,
  listCompetitors,
} from "@/lib/seo-intelligence/competitors";
import type {
  SeoIntelCompetitorStatus,
  SeoIntelCompetitorType,
  SeoIntelPriority,
} from "@/lib/seo-intelligence/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const url = new URL(req.url);
  const status = url.searchParams.get("status") as SeoIntelCompetitorStatus | null;
  const competitors = await listCompetitors({
    status: status || undefined,
    includeBlocked: url.searchParams.get("includeBlocked") === "1",
  });
  return NextResponse.json({ competitors });
}

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  try {
    const body = (await req.json()) as {
      domain?: string;
      displayName?: string;
      type?: SeoIntelCompetitorType;
      categories?: string[];
      notes?: string;
      priority?: SeoIntelPriority;
      status?: SeoIntelCompetitorStatus;
    };
    if (!body.domain?.trim()) {
      return NextResponse.json({ error: "domain is required" }, { status: 400 });
    }
    const result = await addCompetitor({
      domain: body.domain,
      displayName: body.displayName,
      type: body.type,
      categories: body.categories,
      notes: body.notes,
      priority: body.priority,
      status: body.status ?? "approved",
      source: "manual",
      actor: auth.uid,
      confidence: 100,
      relevanceScore: 70,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ competitor: result.competitor });
  } catch (e) {
    console.error("[seo-intelligence/competitors POST]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Add failed" },
      { status: 500 },
    );
  }
}
