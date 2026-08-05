import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  parseSeoPageFromFirestore,
  type SeoPageFirestore,
} from "@/lib/seo-page-firestore";

export const runtime = "nodejs";

/** List all SEO guide pages (published + drafts) for Blog posts & schedule. */
export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }

  try {
    const snap = await db.collection("seoPages").get();
    const pages: SeoPageFirestore[] = [];
    for (const d of snap.docs) {
      const p = parseSeoPageFromFirestore(d.id, d.data() as Record<string, unknown>, {
        requirePublished: false,
      });
      if (p) pages.push(p);
    }
    pages.sort(
      (a, b) =>
        b.updatedAt.localeCompare(a.updatedAt) ||
        a.headline.localeCompare(b.headline),
    );
    return NextResponse.json({ ok: true, pages });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to list guides" },
      { status: 500 },
    );
  }
}
