import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  isValidBlogSlug,
  normalizeBlogSlugInput,
} from "@/lib/blog-firestore";
import { publishBlogPostNow } from "@/lib/blog-automation/scheduled-posts";

export const runtime = "nodejs";
export const maxDuration = 120;

type BulkAction = "publish" | "unpublish" | "delete";

function normalizeSlugs(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const slug = normalizeBlogSlugInput(String(item ?? ""));
    if (!isValidBlogSlug(slug) || seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
  }
  return out;
}

/**
 * Bulk publish / unpublish / delete for admin blog table multi-select.
 */
export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { action?: string; slugs?: unknown } = {};
  try {
    body = (await req.json()) as { action?: string; slugs?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = String(body.action ?? "").trim() as BulkAction;
  if (action !== "publish" && action !== "unpublish" && action !== "delete") {
    return NextResponse.json(
      { error: "action must be publish, unpublish, or delete" },
      { status: 400 },
    );
  }

  const slugs = normalizeSlugs(body.slugs);
  if (slugs.length === 0) {
    return NextResponse.json({ error: "Select at least one blog" }, { status: 400 });
  }
  if (slugs.length > 100) {
    return NextResponse.json(
      { error: "Max 100 blogs per bulk action" },
      { status: 400 },
    );
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const ok: string[] = [];
  const failed: { slug: string; error: string }[] = [];
  let touchedPublic = false;

  for (const slug of slugs) {
    try {
      const ref = db.collection("blogPosts").doc(slug);
      const snap = await ref.get();
      if (!snap.exists) {
        failed.push({ slug, error: "Not found" });
        continue;
      }

      if (action === "delete") {
        await ref.delete();
        ok.push(slug);
        touchedPublic = true;
        continue;
      }

      if (action === "unpublish") {
        await ref.set({ published: false, publishedAt: null }, { merge: true });
        ok.push(slug);
        touchedPublic = true;
        continue;
      }

      // publish
      const pub = await publishBlogPostNow(slug);
      if (!pub.ok) {
        failed.push({ slug, error: pub.error || "Publish failed" });
        continue;
      }
      ok.push(slug);
      touchedPublic = true;
    } catch (e) {
      failed.push({
        slug,
        error: e instanceof Error ? e.message : "Failed",
      });
    }
  }

  if (touchedPublic) {
    revalidatePath("/blog");
    for (const slug of ok) {
      revalidatePath(`/blog/${slug}`);
    }
  }

  return NextResponse.json({
    ok: true,
    action,
    succeeded: ok,
    failed,
    successCount: ok.length,
    failCount: failed.length,
  });
}
