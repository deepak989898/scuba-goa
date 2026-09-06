import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { listGalleryMediaForSocial } from "@/lib/social-media/gallery-media";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(req.url);
  const kind = url.searchParams.get("kind");
  const filter =
    kind === "video" || kind === "reel" || kind === "all" ? kind : "all";

  const items = await listGalleryMediaForSocial(filter);
  return NextResponse.json({
    items: items.map((item) => ({
      id: item.id,
      title: item.title,
      contentType: item.contentType,
      mediaUrl: item.mediaUrl,
      posterUrl: item.posterUrl,
      category: item.category,
      source: item.source,
      serviceSlug: item.serviceSlug,
    })),
    counts: {
      video: items.filter((i) => i.contentType === "video").length,
      reel: items.filter((i) => i.contentType === "reel").length,
    },
  });
}
