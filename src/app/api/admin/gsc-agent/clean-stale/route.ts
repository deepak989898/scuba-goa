import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { cleanStaleSeoUrls } from "@/lib/gsc-indexing-agent/clean-stale";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Preview or delete seoUrls that are no longer on the live site.
 * Body: { confirm?: boolean } — omit/false = dry-run only.
 */
export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { confirm?: boolean } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }

  const confirm = body.confirm === true;
  const detail = await cleanStaleSeoUrls({ dryRun: !confirm });

  return NextResponse.json({
    ok: true,
    detail,
    message: confirm
      ? `Deleted ${detail.deleted} stale URLs. Live kept: ${detail.live}.`
      : `Preview: ${detail.stale} stale of ${detail.tracked} tracked (live site ≈ ${detail.live}). Confirm to delete.`,
  });
}
