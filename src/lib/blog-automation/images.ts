import { getStorage } from "firebase-admin/storage";
import sharp from "sharp";
import { getAdminApp } from "@/lib/firebase-admin";

const MAX_WIDTH = 1200;
const WEBP_QUALITY = 82;

export async function downloadCompressUploadBlogImage(input: {
  imageUrl: string;
  slug: string;
}): Promise<{ featuredImageUrl: string; ogImageUrl: string }> {
  const app = getAdminApp();
  if (!app) throw new Error("Firebase Admin not configured");

  const bucketName =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    process.env.FIREBASE_STORAGE_BUCKET;
  if (!bucketName) throw new Error("Storage bucket not configured");

  const res = await fetch(input.imageUrl, {
    headers: { "User-Agent": "BlueSharkGoa-BlogBot/1.0" },
  });
  if (!res.ok) throw new Error(`Failed to download image: ${res.status}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  const compressed = await sharp(buffer)
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  const path = `blog/${input.slug}/featured.webp`;
  const bucket = getStorage(app).bucket(bucketName);
  const file = bucket.file(path);
  await file.save(compressed, {
    metadata: {
      contentType: "image/webp",
      cacheControl: "public, max-age=31536000, immutable",
    },
  });
  await file.makePublic();
  const publicUrl = `https://storage.googleapis.com/${bucketName}/${path}`;
  return { featuredImageUrl: publicUrl, ogImageUrl: publicUrl };
}
