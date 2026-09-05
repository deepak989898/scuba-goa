import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import {
  clampImageQuality,
  clampImageWidth,
  isRemoteImageFetchAllowed,
  resolvePublicFilePath,
} from "@/lib/image-optimize";

export const runtime = "nodejs";

const CACHE_ONE_YEAR = "public, max-age=31536000, immutable";

async function loadImageBytes(src: string): Promise<Buffer> {
  const trimmed = src.trim();
  if (trimmed.startsWith("/")) {
    const rel = resolvePublicFilePath(trimmed);
    if (!rel) throw new Error("invalid local path");
    const filePath = path.join(process.cwd(), "public", rel);
    const resolved = path.resolve(filePath);
    const publicRoot = path.resolve(process.cwd(), "public");
    if (!resolved.startsWith(publicRoot + path.sep) && resolved !== publicRoot) {
      throw new Error("path traversal");
    }
    return readFile(resolved);
  }

  if (!isRemoteImageFetchAllowed(trimmed)) {
    throw new Error("remote host not allowed");
  }

  const res = await fetch(trimmed, {
    headers: { Accept: "image/*,*/*;q=0.8" },
    next: { revalidate: 60 * 60 * 24 * 7 },
  });
  if (!res.ok) throw new Error(`upstream ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > 12 * 1024 * 1024) throw new Error("image too large");
  return buf;
}

function pickOutputFormat(accept: string): "avif" | "webp" | "jpeg" {
  const a = accept.toLowerCase();
  if (a.includes("image/avif")) return "avif";
  if (a.includes("image/webp")) return "webp";
  return "jpeg";
}

/** Resize + re-encode images for mobile/desktop (replaces Vercel `/_next/image`). */
export async function GET(req: NextRequest) {
  const src = req.nextUrl.searchParams.get("src")?.trim() ?? "";
  const width = clampImageWidth(
    Number(req.nextUrl.searchParams.get("w") ?? "640"),
  );
  const quality = clampImageQuality(
    Number(req.nextUrl.searchParams.get("q") ?? "75"),
  );

  if (!src) {
    return NextResponse.json({ error: "missing src" }, { status: 400 });
  }

  try {
    const input = await loadImageBytes(src);
    const format = pickOutputFormat(req.headers.get("accept") ?? "");

    let pipeline = sharp(input, { failOn: "none" }).rotate().resize({
      width,
      withoutEnlargement: true,
      fit: "inside",
    });

    let body: Buffer;
    let contentType: string;
    if (format === "avif") {
      body = await pipeline.avif({ quality, effort: 4 }).toBuffer();
      contentType = "image/avif";
    } else if (format === "webp") {
      body = await pipeline.webp({ quality }).toBuffer();
      contentType = "image/webp";
    } else {
      body = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
      contentType = "image/jpeg";
    }

    return new NextResponse(new Uint8Array(body), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": CACHE_ONE_YEAR,
        Vary: "Accept",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "resize failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
