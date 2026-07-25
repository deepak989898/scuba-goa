import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  getSeoUrl,
  listSeoUrls,
  runTechnicalAuditForUrl,
  processInspectionQueue,
} from "@/lib/gsc-indexing-agent";
import { inspectUrlInGsc } from "@/lib/gsc-indexing-agent/gsc-client";
import { upsertSeoUrl, logAction } from "@/lib/gsc-indexing-agent/store";
import { urlIdFromNormalized } from "@/lib/gsc-indexing-agent/normalize-url";
import { assertSafeAuditUrl } from "@/lib/gsc-indexing-agent/ssrf";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { url?: string; urlId?: string; audit?: boolean; processQueue?: boolean } =
    {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.processQueue) {
    const detail = await processInspectionQueue(5);
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

  if (!record) {
    return NextResponse.json({ error: "url or urlId required" }, { status: 400 });
  }

  if (body.audit) {
    const audit = await runTechnicalAuditForUrl(record);
    return NextResponse.json({ ok: true, audit });
  }

  // Read-only URL Inspection — never claims to request indexing
  const result = await inspectUrlInGsc(record.url);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  const now = new Date().toISOString();
  const r = result.result;
  await upsertSeoUrl({
    ...record,
    indexStatus: r.indexStatus,
    coverageState: r.coverageState,
    crawlState: r.crawlState,
    googleCanonical: r.googleCanonical,
    userCanonical: r.userCanonical || record.userCanonical,
    lastCrawlTime: r.lastCrawlTime,
    lastInspectionAt: now,
    nextInspectionAt: new Date(Date.now() + 7 * 86400_000).toISOString(),
    updatedAt: now,
    lastActionAt: now,
  });
  await logAction({
    urlId: record.id,
    url: record.url,
    action: "manual_url_inspection",
    detail: `Status ${r.indexStatus} (read-only; not a request-to-index)`,
    ok: true,
  });

  return NextResponse.json({
    ok: true,
    result: r,
    note: "URL Inspection API reports index status only. It does not submit indexing requests.",
  });
}
