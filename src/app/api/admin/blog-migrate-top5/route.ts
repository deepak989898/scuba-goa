import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { migrateTop5ScubaSpotsArticle } from "@/lib/blog-automation/migrate-top5-scuba-spots";
import {
  TOP5_SCUBA_SPOTS_CLEAN_SLUG,
  TOP5_SCUBA_SPOTS_OLD_SLUG,
} from "@/data/blog/top5-scuba-spots-firestore";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * One-shot admin migration: rewrite + publish clean slug, unpublish `-6`.
 * POST /api/admin/blog-migrate-top5
 */
export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const result = await migrateTop5ScubaSpotsArticle();
    if (!result.ok) {
      return NextResponse.json(result, { status: 409 });
    }
    revalidatePath(`/blog/${TOP5_SCUBA_SPOTS_CLEAN_SLUG}`);
    revalidatePath(`/blog/${TOP5_SCUBA_SPOTS_OLD_SLUG}`);
    revalidatePath("/blog");
    revalidatePath("/sitemap.xml");
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Migration failed" },
      { status: 500 },
    );
  }
}
