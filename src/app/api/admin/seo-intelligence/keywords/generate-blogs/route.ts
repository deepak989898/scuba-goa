import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { generateBlogsFromIntelKeywords } from "@/lib/seo-intelligence/generate-missing-blogs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  try {
    const body = (await req.json().catch(() => ({}))) as {
      keywordIds?: string[];
      requireMissingPage?: boolean;
    };
    const keywordIds = Array.isArray(body.keywordIds)
      ? body.keywordIds.map((id) => String(id).trim()).filter(Boolean)
      : [];
    if (keywordIds.length === 0) {
      return NextResponse.json(
        { error: "keywordIds array is required" },
        { status: 400 },
      );
    }
    if (keywordIds.length > 10) {
      return NextResponse.json(
        { error: "Maximum 10 keywords per request" },
        { status: 400 },
      );
    }

    const result = await generateBlogsFromIntelKeywords(
      keywordIds,
      auth.uid,
      { requireMissingPage: body.requireMissingPage !== false },
    );

    return NextResponse.json(result);
  } catch (e) {
    console.error("[seo-intelligence/keywords/generate-blogs]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Generate failed" },
      { status: 500 },
    );
  }
}
