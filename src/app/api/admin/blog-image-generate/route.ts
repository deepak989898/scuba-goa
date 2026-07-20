import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { brandAndUploadBlogImageBuffer } from "@/lib/blog-automation/images";
import { generateBlogImageBufferFromTitle } from "@/lib/blog-automation/openai-image";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  isValidBlogSlug,
  normalizeBlogSlugInput,
  parseBlogPostFromFirestore,
} from "@/lib/blog-firestore";
import { syncBlogImageToHomeGallery } from "@/lib/home-gallery-sync";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Generate a featured image with OpenAI from the blog title, compress to WebP
 * with brand bar, save to Storage, and update the blog post document.
 */
export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { slug?: string; title?: string } = {};
  try {
    body = (await req.json()) as { slug?: string; title?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const slug = normalizeBlogSlugInput(String(body.slug ?? "").trim());
  if (!isValidBlogSlug(slug)) {
    return NextResponse.json({ error: "Valid slug required" }, { status: 400 });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const ref = db.collection("blogPosts").doc(slug);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json(
      { error: "Blog post not found. Save the blog first, then generate an image." },
      { status: 404 },
    );
  }

  const existing = snap.data() as Record<string, unknown>;
  const title =
    String(body.title ?? "").trim() ||
    String(existing.title ?? "").trim();
  if (!title) {
    return NextResponse.json(
      { error: "Blog title is required to generate an image" },
      { status: 400 },
    );
  }

  try {
    const raw = await generateBlogImageBufferFromTitle(title);
    const urls = await brandAndUploadBlogImageBuffer(raw, slug);

    const now = new Date().toISOString();
    const featuredImageAlt =
      String(existing.featuredImageAlt ?? "").trim() ||
      `${title} — Book Scuba Goa`;

    await ref.set(
      {
        featuredImageUrl: urls.featuredImageUrl,
        ogImageUrl: urls.ogImageUrl,
        featuredImageAlt,
        updatedAt: now,
      },
      { merge: true },
    );

    const post = parseBlogPostFromFirestore(
      slug,
      { ...existing, ...urls, featuredImageAlt },
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
        console.error("[blog-image-generate] gallery sync:", e);
      }
      revalidatePath(`/blog/${slug}`);
      revalidatePath("/blog");
    }

    return NextResponse.json({
      ok: true,
      ...urls,
      featuredImageAlt,
      title,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Image generation failed";
    console.error("[blog-image-generate]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
