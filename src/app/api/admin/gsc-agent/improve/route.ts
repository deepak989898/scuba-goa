import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  generateAndApplyRankingImprove,
  loadEditablePage,
  saveManualRankingEdit,
  type RankingImproveFields,
} from "@/lib/gsc-indexing-agent/ranking-improve";

export const runtime = "nodejs";
export const maxDuration = 120;

/** GET ?urlId= — load editable blog/guide fields */
export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const urlId = new URL(req.url).searchParams.get("urlId")?.trim();
  if (!urlId) {
    return NextResponse.json({ error: "urlId required" }, { status: 400 });
  }

  try {
    const page = await loadEditablePage(urlId);
    return NextResponse.json({ page });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Load failed" },
      { status: 400 },
    );
  }
}

/** POST { urlId } — OpenAI content generate + auto-save (no images) */
export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { urlId?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const urlId = String(body.urlId ?? "").trim();
  if (!urlId) {
    return NextResponse.json({ error: "urlId required" }, { status: 400 });
  }

  try {
    const result = await generateAndApplyRankingImprove(urlId);
    return NextResponse.json({
      ok: true,
      page: result.page,
      improve: result.improve,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Generate failed" },
      { status: 400 },
    );
  }
}

/** PATCH { urlId, ...fields } — manual edit save */
export async function PATCH(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const urlId = String(body.urlId ?? "").trim();
  if (!urlId) {
    return NextResponse.json({ error: "urlId required" }, { status: 400 });
  }

  const keywords =
    body.keywords != null
      ? Array.isArray(body.keywords)
        ? body.keywords.map((k) => String(k).trim()).filter(Boolean)
        : String(body.keywords)
            .split(/[,|\n]+/)
            .map((s) => s.trim())
            .filter(Boolean)
      : undefined;

  const faqs =
    body.faqs != null && Array.isArray(body.faqs)
      ? body.faqs
          .map((f) => {
            if (!f || typeof f !== "object") return null;
            const q = String((f as { question?: string }).question ?? "").trim();
            const a = String((f as { answer?: string }).answer ?? "").trim();
            return q && a ? { question: q, answer: a } : null;
          })
          .filter(Boolean)
      : undefined;

  const patch: Partial<RankingImproveFields> = {
    ...(body.title != null ? { title: String(body.title) } : {}),
    ...(body.headline != null ? { headline: String(body.headline) } : {}),
    ...(body.metaTitle != null ? { metaTitle: String(body.metaTitle) } : {}),
    ...(body.metaDescription != null
      ? { metaDescription: String(body.metaDescription) }
      : {}),
    ...(body.excerpt != null ? { excerpt: String(body.excerpt) } : {}),
    ...(keywords ? { keywords } : {}),
    ...(body.content != null ? { content: String(body.content) } : {}),
    ...(body.bodyContent != null
      ? { bodyContent: String(body.bodyContent) }
      : {}),
    ...(faqs ? { faqs: faqs as RankingImproveFields["faqs"] } : {}),
  };

  try {
    const page = await saveManualRankingEdit(urlId, patch);
    return NextResponse.json({ ok: true, page });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Save failed" },
      { status: 400 },
    );
  }
}
