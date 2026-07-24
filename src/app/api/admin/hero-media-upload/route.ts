import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getStorage } from "firebase-admin/storage";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { getAdminApp } from "@/lib/firebase-admin";
import { compressHeroBannerImage } from "@/lib/heroImageCompress";
import { isHeroOptimizedWebpUrl } from "@/lib/hero-webp";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 95 * 1024 * 1024;
const MAX_IMAGE_INPUT_BYTES = 25 * 1024 * 1024;
const MAX_REMOTE_IMAGE_BYTES = 25 * 1024 * 1024;

function normalizeBucket(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  let v = raw.trim();
  if (!v) return undefined;
  v = v.replace(/^gs:\/\//i, "");
  v = v.replace(/^https?:\/\/storage\.googleapis\.com\//i, "");
  v = v.replace(/^https?:\/\/firebasestorage\.googleapis\.com\/v0\/b\//i, "");
  v = v.replace(/\/.*$/, "");
  return v || undefined;
}

function firebaseDownloadUrl(
  bucketName: string,
  objectPath: string,
  token: string,
): string {
  const enc = encodeURIComponent(objectPath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${enc}?alt=media&token=${token}`;
}

async function fetchRemoteImage(url: string): Promise<Buffer> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid image URL");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Image URL must be http(s)");
  }

  const res = await fetch(url, {
    redirect: "follow",
    headers: {
      Accept: "image/*,*/*",
      "User-Agent": "BookScubaGoaHeroOptimizer/1.0",
    },
  });
  if (!res.ok) {
    throw new Error(`Could not download image (HTTP ${res.status})`);
  }
  const len = Number(res.headers.get("content-length") || 0);
  if (len > MAX_REMOTE_IMAGE_BYTES) {
    throw new Error("Remote image is too large (max 25 MB)");
  }
  const ab = await res.arrayBuffer();
  if (ab.byteLength > MAX_REMOTE_IMAGE_BYTES) {
    throw new Error("Remote image is too large (max 25 MB)");
  }
  return Buffer.from(ab);
}

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const app = getAdminApp();
  if (!app) {
    return NextResponse.json(
      { error: "Server not configured (Firebase Admin)" },
      { status: 500 },
    );
  }

  const bucketName =
    normalizeBucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) ??
    normalizeBucket(process.env.FIREBASE_STORAGE_BUCKET);
  if (!bucketName) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is not set on the server" },
      { status: 500 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const kind = String(form.get("kind") ?? "").trim();
  if (kind !== "video" && kind !== "poster" && kind !== "thumbnail") {
    return NextResponse.json(
      { error: "kind must be video, poster, or thumbnail" },
      { status: 400 },
    );
  }

  const sourceUrl = String(form.get("sourceUrl") ?? "").trim();
  const file = form.get("file");
  const hasFile = file instanceof Blob && file.size > 0;
  const isImage = kind === "poster" || kind === "thumbnail";

  // Already our optimized WebP — return as-is (no re-upload).
  if (isImage && sourceUrl && !hasFile && isHeroOptimizedWebpUrl(sourceUrl)) {
    return NextResponse.json({
      url: sourceUrl,
      bytes: null,
      contentType: "image/webp",
      alreadyOptimized: true,
    });
  }

  if (!hasFile && !(isImage && sourceUrl)) {
    return NextResponse.json(
      { error: isImage ? "Missing file or sourceUrl" : "Missing file" },
      { status: 400 },
    );
  }

  if (hasFile && file.size > MAX_BYTES) {
    return NextResponse.json(
      {
        error:
          "File too large for server upload. Use a smaller clip or apply storage.cors.json to your bucket (see repo) and use direct upload.",
      },
      { status: 413 },
    );
  }

  if (isImage && hasFile && file.size > MAX_IMAGE_INPUT_BYTES) {
    return NextResponse.json(
      {
        error:
          "Image too large (max 25 MB). Export a smaller original — we'll compress it to WebP under 200 KB automatically.",
      },
      { status: 413 },
    );
  }

  const folder =
    kind === "video"
      ? "hero/videos"
      : kind === "thumbnail"
        ? "hero/thumbnails"
        : "hero/posters";

  /**
   * Hero banner images are re-encoded as web-optimized WebP (≤1200px wide,
   * ≤200KB) before they reach Storage.
   */
  let buffer: Buffer;
  let contentType =
    (hasFile && file.type) || (kind === "video" ? "video/mp4" : "image/jpeg");
  let finalNameSuffix = "";
  let originalBytes = 0;

  if (isImage) {
    try {
      if (hasFile) {
        buffer = Buffer.from(await file.arrayBuffer());
        originalBytes = buffer.length;
      } else {
        buffer = await fetchRemoteImage(sourceUrl);
        originalBytes = buffer.length;
      }
      const converted = await compressHeroBannerImage(buffer);
      buffer = Buffer.from(converted.buffer);
      contentType = converted.contentType;
      finalNameSuffix = ".webp";
    } catch (e) {
      console.error("hero-media-upload compress failed", e);
      const msg =
        e instanceof Error ? e.message : "Could not process this image";
      return NextResponse.json(
        {
          error: `${msg}. Try a JPG/PNG/WebP under 25 MB.`,
        },
        { status: 400 },
      );
    }
  } else {
    buffer = Buffer.from(await (file as Blob).arrayBuffer());
    originalBytes = buffer.length;
  }

  const originalRaw =
    hasFile && file instanceof File && file.name.trim()
      ? file.name.replace(/[^\w.-]+/g, "_")
      : kind === "video"
        ? "upload.mp4"
        : "upload.jpg";
  const original = isImage
    ? originalRaw.replace(/\.[^.]+$/, "") + finalNameSuffix
    : originalRaw;
  const objectPath = `${folder}/${Date.now()}_${original}`;
  const token = randomUUID();

  const bucket = getStorage(app).bucket(bucketName);
  const gcsFile = bucket.file(objectPath);

  try {
    await gcsFile.save(buffer, {
      resumable: false,
      metadata: {
        contentType,
        metadata: {
          firebaseStorageDownloadTokens: token,
        },
      },
    });
  } catch (e) {
    console.error("hero-media-upload save failed", e);
    return NextResponse.json({ error: "Storage upload failed" }, { status: 500 });
  }

  const url = firebaseDownloadUrl(bucketName, objectPath, token);
  return NextResponse.json({
    url,
    bytes: buffer.length,
    originalBytes,
    contentType,
    alreadyOptimized: false,
  });
}
