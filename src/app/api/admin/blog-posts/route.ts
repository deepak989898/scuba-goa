import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  blogPostToFirestorePayload,
  isValidBlogSlug,
  normalizeBlogSlugInput,
  parseBlogPostFromFirestore,
  type BlogLanguage,
} from "@/lib/blog-firestore";
import { syncBlogImageToHomeGallery } from "@/lib/home-gallery-sync";
import { postBlogToGoogleBusinessProfile } from "@/lib/google-business/sync-blog-post";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }
  const snap = await db.collection("blogPosts").get();
  const posts = snap.docs
    .map((d) =>
      parseBlogPostFromFirestore(d.id, d.data() as Record<string, unknown>, {
        requirePublished: false,
      }),
    )
    .filter(Boolean)
    .sort((a, b) =>
      (b?.updatedAt ?? "").localeCompare(a?.updatedAt ?? ""),
    );
  return NextResponse.json({ posts });
}

export async function PATCH(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const slug = normalizeBlogSlugInput(String(body.slug ?? ""));
  if (!isValidBlogSlug(slug)) {
    return NextResponse.json({ error: "Valid slug required" }, { status: 400 });
  }
  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const ref = db.collection("blogPosts").doc(slug);
  const existing = await ref.get();
  if (!existing.exists) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const current = parseBlogPostFromFirestore(
    slug,
    existing.data() as Record<string, unknown>,
    { requirePublished: false },
  );
  if (!current) {
    return NextResponse.json({ error: "Invalid post data" }, { status: 400 });
  }

  const langRaw = body.language != null ? String(body.language) : current.language;
  const language: BlogLanguage =
    langRaw === "en" || langRaw === "hi" || langRaw === "hinglish"
      ? langRaw
      : current.language;

  const keywords =
    body.keywords != null
      ? Array.isArray(body.keywords)
        ? body.keywords.map((k) => String(k).trim()).filter(Boolean)
        : String(body.keywords)
            .split(/[,|\n]+/)
            .map((s) => s.trim())
            .filter(Boolean)
      : current.keywords;

  const faqs =
    body.faqs != null && Array.isArray(body.faqs)
      ? body.faqs
          .map((f) => {
            if (!f || typeof f !== "object") return null;
            const q = String((f as { question?: string }).question ?? "").trim();
            const a = String((f as { answer?: string }).answer ?? "").trim();
            return q && a ? { question: q, answer: a } : null;
          })
          .filter(Boolean)
      : current.faqs;

  const published =
    typeof body.published === "boolean" ? body.published : current.published;
  const now = new Date().toISOString();

  const next = blogPostToFirestorePayload({
    slug,
    title: body.title != null ? String(body.title).trim() : current.title,
    excerpt: body.excerpt != null ? String(body.excerpt).trim() : current.excerpt,
    metaTitle:
      body.metaTitle != null ? String(body.metaTitle).trim() : current.metaTitle,
    metaDescription:
      body.metaDescription != null
        ? String(body.metaDescription).trim()
        : current.metaDescription,
    keywords,
    content: body.content != null ? String(body.content) : current.content,
    faqs: faqs as { question: string; answer: string }[],
    date: body.date != null ? String(body.date).trim() : current.date,
    readTime:
      body.readTime != null ? String(body.readTime).trim() : current.readTime,
    featuredImageUrl:
      body.featuredImageUrl != null
        ? String(body.featuredImageUrl).trim()
        : current.featuredImageUrl,
    ogImageUrl:
      body.ogImageUrl != null
        ? String(body.ogImageUrl).trim()
        : body.featuredImageUrl != null
          ? String(body.featuredImageUrl).trim()
          : current.ogImageUrl,
    language,
    published,
    source: current.source,
    serviceSlug:
      body.serviceSlug != null
        ? String(body.serviceSlug).trim()
        : current.serviceSlug,
    pillar: body.pillar === true,
    createdAt: current.createdAt,
    publishedAt:
      published && !current.publishedAt
        ? now
        : current.publishedAt,
    updatedAt: now,
  });

  await ref.set(next, { merge: true });

  try {
    await syncBlogImageToHomeGallery({
      blogSlug: slug,
      title: next.title as string,
      featuredImageUrl: next.featuredImageUrl as string,
      serviceSlug: next.serviceSlug as string,
      published: next.published === true,
    });
  } catch (e) {
    console.error("[blog-posts] gallery sync failed:", e);
  }

  if (next.published === true) {
    try {
      await postBlogToGoogleBusinessProfile({
        slug,
        title: next.title as string,
        excerpt: next.excerpt as string,
        featuredImageUrl: String(next.featuredImageUrl ?? "").trim() || undefined,
        language: next.language as "en" | "hi" | "hinglish",
      });
    } catch (e) {
      console.error("[blog-posts] Google Business sync failed:", e);
    }
  }

  return NextResponse.json({ ok: true, slug });
}

export async function DELETE(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }
  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }
  await db.collection("blogPosts").doc(slug).delete();
  return NextResponse.json({ ok: true });
}
