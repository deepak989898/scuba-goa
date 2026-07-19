import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getStorage } from "firebase-admin/storage";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  compressContentImage,
  isAllowedImageMime,
  type ContentImageProfile,
} from "@/lib/contentImageCompress";
import { getAdminApp } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const MAX_INPUT_BYTES = 25 * 1024 * 1024;

const PROFILES = new Set<ContentImageProfile>([
  "hero",
  "featured",
  "card",
  "og",
  "thumbnail",
]);

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

function firebaseDownloadUrl(bucketName: string, objectPath: string, token: string): string {
  const enc = encodeURIComponent(objectPath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${enc}?alt=media&token=${token}`;
}

/**
 * Generic admin image upload → WebP in Firebase Storage.
 * Form fields: file, profile? (hero|featured|card|og|thumbnail), folder? (storage prefix)
 */
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
    form = await formDataSafe(req);
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const profileRaw = String(form.get("profile") ?? "card").trim() as ContentImageProfile;
  const profile = PROFILES.has(profileRaw) ? profileRaw : "card";

  const folderRaw = String(form.get("folder") ?? "uploads/images").trim();
  const folder = folderRaw
    .replace(/\\/g, "/")
    .replace(/\.\./g, "")
    .replace(/^\/+|\/+$/g, "")
    .slice(0, 120) || "uploads/images";

  const file = form.get("file");
  if (!(file instanceof Blob) || file.size <= 0) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (file.size > MAX_INPUT_BYTES) {
    return NextResponse.json(
      { error: "Image too large (max 25 MB). We'll compress to WebP automatically." },
      { status: 413 },
    );
  }
  if (!isAllowedImageMime(file.type)) {
    return NextResponse.json(
      { error: "Unsupported file type. Use JPG, PNG, or WebP." },
      { status: 400 },
    );
  }

  const input = Buffer.from(await file.arrayBuffer());
  let converted;
  try {
    converted = await compressContentImage(input, profile);
  } catch (e) {
    console.error("media-image-upload compress failed", e);
    return NextResponse.json(
      { error: "Could not process this image. Try a JPG/PNG/WebP under 25 MB." },
      { status: 400 },
    );
  }

  const originalRaw =
    file instanceof File && file.name.trim()
      ? file.name.replace(/[^\w.-]+/g, "_")
      : "upload.jpg";
  const baseName = originalRaw.replace(/\.[^.]+$/, "") || "upload";
  const objectPath = `${folder}/${Date.now()}_${baseName}.webp`;
  const token = randomUUID();

  const bucket = getStorage(app).bucket(bucketName);
  try {
    await bucket.file(objectPath).save(converted.buffer, {
      resumable: false,
      metadata: {
        contentType: converted.contentType,
        metadata: { firebaseStorageDownloadTokens: token },
      },
    });
  } catch (e) {
    console.error("media-image-upload save failed", e);
    return NextResponse.json({ error: "Storage upload failed" }, { status: 500 });
  }

  const url = firebaseDownloadUrl(bucketName, objectPath, token);
  return NextResponse.json({
    url,
    bytes: converted.bytes,
    contentType: converted.contentType,
    width: converted.width,
    height: converted.height,
    quality: converted.quality,
    profile: converted.profile,
  });
}

async function formDataSafe(req: Request): Promise<FormData> {
  return req.formData();
}
