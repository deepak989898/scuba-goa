import { NextResponse } from "next/server";
import {
  fetchImageAsInstagramJpeg,
  isAllowedInstagramMediaSource,
} from "@/lib/social-media/instagram-image";

export const runtime = "nodejs";

/** Public image proxy for Instagram Graph API (Meta cannot fetch Firebase token URLs). */
export async function GET(req: Request) {
  const src = new URL(req.url).searchParams.get("u")?.trim();
  if (!src || !isAllowedInstagramMediaSource(src)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const jpeg = await fetchImageAsInstagramJpeg(src);
    return new NextResponse(new Uint8Array(jpeg), {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (e) {
    console.error("ig-media proxy failed", src, e);
    return new NextResponse("Not found", { status: 404 });
  }
}
