import { NextResponse } from "next/server";
import {
  buildSegmentEntries,
  renderUrlset,
} from "@/lib/gsc-indexing-agent/sitemap-xml";

export const runtime = "nodejs";
export const revalidate = 3600;

type Props = { params: Promise<{ segment: string }> };

/** Segment XML sitemaps for Search Console (blog / guides / services / static). */
export async function GET(_req: Request, { params }: Props) {
  const { segment } = await params;
  if (
    segment !== "blog.xml" &&
    segment !== "guides.xml" &&
    segment !== "services.xml" &&
    segment !== "static.xml"
  ) {
    return new NextResponse("Not found", { status: 404 });
  }
  const key = segment.replace(/\.xml$/, "") as
    | "blog"
    | "guides"
    | "services"
    | "static";
  const entries = await buildSegmentEntries(key);
  const xml = renderUrlset(entries);
  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
