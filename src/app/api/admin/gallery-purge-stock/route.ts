import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { purgeStockFromHomeGallery } from "@/lib/home-gallery-sync";

export const runtime = "nodejs";

/** Remove free-stock photos from `/gallery` without re-syncing blog posts. */
export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const result = await purgeStockFromHomeGallery();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Purge failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
