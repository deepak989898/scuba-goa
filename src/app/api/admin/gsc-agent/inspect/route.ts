import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  getSeoUrl,
  listSeoUrls,
  runTechnicalAuditForUrl,
  processInspectionQueue,
  refreshSeoUrlInspection,
  refreshSeoUrlInspectionBulk,
} from "@/lib/gsc-indexing-agent";
import { urlIdFromNormalized } from "@/lib/gsc-indexing-agent/normalize-url";
import { assertSafeAuditUrl } from "@/lib/gsc-indexing-agent/ssrf";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: {
    url?: string;
    urlId?: string;
    urlIds?: string[];
    audit?: boolean;
    processQueue?: boolean;
    refreshPending?: boolean;
    max?: number;
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.processQueue) {
    const max = Math.min(50, Math.max(1, Number(body.max) || 25));
    const detail = await processInspectionQueue(max);
    return NextResponse.json({ ok: true, detail });
  }

  if (body.refreshPending) {
    const max = Math.min(30, Math.max(1, Number(body.max) || 20));
    const urls = await listSeoUrls({ limit: 500, filter: "unknown" });
    const ids = urls
      .filter(
        (u) =>
          u.indexStatus === "PENDING_INSPECTION" ||
          u.indexStatus === "UNKNOWN" ||
          u.indexStatus === "API_ERROR" ||
          !u.lastInspectionAt,
      )
      .map((u) => u.id)
      .slice(0, max);
    const detail = await refreshSeoUrlInspectionBulk(ids, max);
    return NextResponse.json({ ok: true, detail });
  }

  const urlIds = Array.isArray(body.urlIds)
    ? body.urlIds.map(String).filter(Boolean)
    : [];
  if (urlIds.length > 1) {
    const max = Math.min(30, Math.max(1, Number(body.max) || 20));
    const detail = await refreshSeoUrlInspectionBulk(urlIds, max);
    return NextResponse.json({ ok: true, detail });
  }

  let record = body.urlId ? await getSeoUrl(body.urlId) : null;
  if (!record && body.url) {
    const safe = assertSafeAuditUrl(body.url);
    if (!safe.ok) {
      return NextResponse.json({ error: safe.error }, { status: 400 });
    }
    const id = urlIdFromNormalized(safe.url);
    record = await getSeoUrl(id);
    if (!record) {
      const urls = await listSeoUrls({ limit: 500 });
      record = urls.find((u) => u.normalizedUrl === safe.url) || null;
    }
    if (!record) {
      return NextResponse.json(
        { error: "URL not in inventory. Run inventory discovery first." },
        { status: 404 },
      );
    }
  }

  const singleId = urlIds[0] || body.urlId;
  if (!record && singleId) {
    record = await getSeoUrl(String(singleId));
  }

  if (!record) {
    return NextResponse.json({ error: "url, urlId, or urlIds required" }, { status: 400 });
  }

  if (body.audit) {
    const audit = await runTechnicalAuditForUrl(record);
    return NextResponse.json({ ok: true, audit });
  }

  const result = await refreshSeoUrlInspection(record.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Inspection failed" }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    indexStatus: result.indexStatus,
    note: "URL Inspection API reports index status only. It does not submit indexing requests.",
  });
}
