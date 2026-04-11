import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getStorage } from "firebase-admin/storage";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { getAdminApp } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const MAX_BYTES = 12 * 1024 * 1024;

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
  if (kind !== "og" && kind !== "hero") {
    return NextResponse.json(
      { error: "kind must be og or hero" },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof Blob) || file.size <= 0) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image too large (max 12 MB)" }, { status: 413 });
  }

  const folder = kind === "og" ? "seo/og" : "seo/hero";
  const original =
    file instanceof File && file.name.trim()
      ? file.name.replace(/[^\w.-]+/g, "_")
      : "upload.jpg";
  const objectPath = `${folder}/${Date.now()}_${original}`;
  const token = randomUUID();
  const contentType = file.type || "image/jpeg";

  const buffer = Buffer.from(await file.arrayBuffer());
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
    console.error("seo-image-upload save failed", e);
    return NextResponse.json({ error: "Storage upload failed" }, { status: 500 });
  }

  const url = firebaseDownloadUrl(bucketName, objectPath, token);
  return NextResponse.json({ url });
}
