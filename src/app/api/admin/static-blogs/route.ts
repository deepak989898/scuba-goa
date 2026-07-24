import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { blogPostToFirestorePayload } from "@/lib/blog-firestore";
import {
  getStaticCodeBlogBySlug,
  listStaticCodeBlogs,
  staticBlogToFirestorePost,
} from "@/lib/blog-automation/static-code-blogs";

export const runtime = "nodejs";

/** List static/code blogs + whether Firestore already overrides each slug. */
export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const db = getAdminDb();
  const firestoreSlugs = new Set<string>();
  if (db) {
    const snap = await db.collection("blogPosts").select("slug").get();
    for (const d of snap.docs) firestoreSlugs.add(d.id);
  }

  const posts = listStaticCodeBlogs(firestoreSlugs);
  return NextResponse.json({
    posts,
    count: posts.length,
  });
}

/**
 * Import a static/code blog into Firestore so admin can edit it.
 * Live site prefers Firestore over code when the same slug exists.
 */
export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { slug?: string; published?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slug = String(body.slug ?? "")
    .trim()
    .toLowerCase();
  const staticPost = getStaticCodeBlogBySlug(slug);
  if (!staticPost) {
    return NextResponse.json(
      { error: "Static blog not found for that slug" },
      { status: 404 },
    );
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const existing = await db.collection("blogPosts").doc(slug).get();
  if (existing.exists) {
    const { parseBlogPostFromFirestore } = await import("@/lib/blog-firestore");
    const post = parseBlogPostFromFirestore(
      slug,
      existing.data() as Record<string, unknown>,
      { requirePublished: false },
    );
    return NextResponse.json({
      ok: true,
      alreadyExists: true,
      post,
    });
  }

  const post = staticBlogToFirestorePost(staticPost, {
    published: body.published !== false,
  });
  await db
    .collection("blogPosts")
    .doc(slug)
    .set(blogPostToFirestorePayload(post), { merge: true });

  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  revalidatePath("/");

  return NextResponse.json({ ok: true, alreadyExists: false, post });
}
