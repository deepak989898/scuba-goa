import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { brandAndUploadBlogImageBuffer } from "@/lib/blog-automation/images";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  isValidBlogSlug,
  normalizeBlogSlugInput,
  parseBlogPostFromFirestore,
} from "@/lib/blog-firestore";
import { syncBlogImageToHomeGallery } from "@/lib/home-gallery-sync";

export const runtime = "nodejs";

const MAX_BYTES = 12 * 1024 * 1024;

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const slugRaw = String(form.get("slug") ?? "").trim();
  const slug = normalizeBlogSlugInput(slugRaw);
  if (!isValidBlogSlug(slug)) {
    return NextResponse.json({ error: "Valid slug required" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof Blob) || file.size <= 0) {
    return NextResponse.json({ error: "Missing image file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image too large (max 12 MB)" }, { status: 413 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const urls = await brandAndUploadBlogImageBuffer(buffer, slug);

    const db = getAdminDb();
    if (db) {
      const ref = db.collection("blogPosts").doc(slug);
      const snap = await ref.get();
      const now = new Date().toISOString();
      await ref.set(
        {
          featuredImageUrl: urls.featuredImageUrl,
          ogImageUrl: urls.ogImageUrl,
          updatedAt: now,
        },
        { merge: true },
      );

      const post = parseBlogPostFromFirestore(
        slug,
        { ...(snap.data() as Record<string, unknown> | undefined), ...urls },
        { requirePublished: false },
      );
      if (post?.published && urls.featuredImageUrl) {
        try {
          await syncBlogImageToHomeGallery({
            blogSlug: slug,
            title: post.title,
            featuredImageUrl: urls.featuredImageUrl,
            serviceSlug: post.serviceSlug,
            published: true,
          });
        } catch (e) {
          console.error("[blog-image-upload] gallery sync:", e);
        }
        revalidatePath(`/blog/${slug}`);
        revalidatePath("/blog");
      }
    }

    return NextResponse.json({ ok: true, ...urls });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
