import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  blogPostToFirestorePayload,
  isValidBlogSlug,
  normalizeBlogSlugInput,
  parseBlogPostFromFirestore,
  type BlogLanguage,
  type BlogPostFirestore,
} from "@/lib/blog-firestore";
import {
  istDatetimeLocalValueToUtcIso,
  istSlotToUtcIso,
} from "@/lib/blog-automation/schedule-ist";
import { parseSlotToMinutes } from "@/lib/blog-automation/schedule-utils";
import { publishBlogPostNow } from "@/lib/blog-automation/scheduled-posts";
import { syncBlogImageToHomeGallery } from "@/lib/home-gallery-sync";

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
  try {
    const snap = await db.collection("blogPosts").get();
    const posts = snap.docs
      .map((d) => {
        try {
          return parseBlogPostFromFirestore(
            d.id,
            d.data() as Record<string, unknown>,
            { requirePublished: false },
          );
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => {
        const sa = a?.scheduledPublishAt ?? a?.publishedAt ?? a?.updatedAt ?? "";
        const sb = b?.scheduledPublishAt ?? b?.publishedAt ?? b?.updatedAt ?? "";
        return sb.localeCompare(sa);
      });
    return NextResponse.json({ posts });
  } catch (e) {
    console.error("[admin/blog-posts GET]", e);
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? `Blog posts load failed: ${e.message}`
            : "Blog posts load failed",
      },
      { status: 500 },
    );
  }
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
  const now = new Date().toISOString();

  // Allow creating from AI Blog Automation drafts that are not yet in blogPosts.
  let current = existing.exists
    ? parseBlogPostFromFirestore(
        slug,
        existing.data() as Record<string, unknown>,
        { requirePublished: false },
      )
    : null;

  if (!current) {
    const title = String(body.title ?? "").trim();
    const content = String(body.content ?? "").trim();
    if (!title || !content) {
      return NextResponse.json(
        {
          error:
            "Post not found. Provide title and content to create it from a draft.",
        },
        { status: 404 },
      );
    }
    current = {
      slug,
      title,
      excerpt: String(body.excerpt ?? "").trim(),
      metaTitle: String(body.metaTitle ?? title).trim(),
      metaDescription: String(body.metaDescription ?? "").trim(),
      keywords: Array.isArray(body.keywords)
        ? body.keywords.map((k) => String(k).trim()).filter(Boolean)
        : [],
      content,
      faqs: [],
      date: String(body.date ?? now.slice(0, 10)).trim(),
      updatedAt: now,
      readTime: String(body.readTime ?? "5 min read").trim(),
      featuredImageUrl: String(body.featuredImageUrl ?? "").trim(),
      featuredImageAlt: String(body.featuredImageAlt ?? "").trim() || undefined,
      ogImageUrl: String(body.ogImageUrl ?? body.featuredImageUrl ?? "").trim(),
      language:
        body.language === "en" || body.language === "hi" || body.language === "hinglish"
          ? body.language
          : "en",
      published: false,
      source: "auto",
      serviceSlug: String(body.serviceSlug ?? "").trim(),
      pillar: false,
      createdAt: String(body.createdAt ?? now),
      schemaMarkup:
        body.schemaMarkup && typeof body.schemaMarkup === "object"
          ? (body.schemaMarkup as Record<string, unknown>)
          : undefined,
      imageMeta:
        body.imageMeta && typeof body.imageMeta === "object"
          ? (body.imageMeta as BlogPostFirestore["imageMeta"])
          : undefined,
    };
  }

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

  let published =
    typeof body.published === "boolean" ? body.published : current.published;

  let scheduleDateIst =
    body.scheduleDateIst != null
      ? String(body.scheduleDateIst).trim()
      : current.scheduleDateIst;
  let publishSlotIst =
    body.publishSlotIst != null
      ? String(body.publishSlotIst).trim()
      : current.publishSlotIst;
  let scheduledPublishAt =
    body.scheduledPublishAt != null
      ? String(body.scheduledPublishAt).trim()
      : current.scheduledPublishAt;

  if (body.scheduledPublishAtIst != null) {
    const converted = istDatetimeLocalValueToUtcIso(
      String(body.scheduledPublishAtIst),
    );
    if (converted) scheduledPublishAt = converted;
  }

  if (
    publishSlotIst &&
    scheduleDateIst &&
    parseSlotToMinutes(publishSlotIst) != null
  ) {
    try {
      scheduledPublishAt = istSlotToUtcIso(scheduleDateIst, publishSlotIst);
    } catch {
      /* keep manual datetime */
    }
  }

  const publishNow = body.publishNow === true;
  if (publishNow) published = true;

  const wasPublished = current.published;

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
    featuredImageAlt:
      body.featuredImageAlt != null
        ? String(body.featuredImageAlt).trim()
        : current.featuredImageAlt,
    ogImageUrl:
      body.ogImageUrl != null
        ? String(body.ogImageUrl).trim()
        : body.featuredImageUrl != null
          ? String(body.featuredImageUrl).trim()
          : current.ogImageUrl,
    language,
    published: publishNow ? false : published,
    source: current.source,
    serviceSlug:
      body.serviceSlug != null
        ? String(body.serviceSlug).trim()
        : current.serviceSlug,
    pillar: body.pillar === true,
    createdAt: current.createdAt,
    publishedAt: current.publishedAt,
    scheduleDateIst: scheduleDateIst || undefined,
    publishSlotIst: publishSlotIst || undefined,
    scheduledPublishAt: scheduledPublishAt || undefined,
    imageMeta: current.imageMeta,
    schemaMarkup: current.schemaMarkup,
    updatedAt: now,
  });

  await ref.set(next, { merge: true });

  const imageChanged =
    String(next.featuredImageUrl ?? "") !== String(current.featuredImageUrl ?? "") ||
    String(next.ogImageUrl ?? "") !== String(current.ogImageUrl ?? "");

  if (publishNow || (published && !wasPublished)) {
    const pub = await publishBlogPostNow(slug);
    if (!pub.ok) {
      return NextResponse.json({ error: pub.error }, { status: 500 });
    }
  } else if (!published && wasPublished) {
    await ref.set({ published: false, publishedAt: null }, { merge: true });
  } else if (published && imageChanged && next.featuredImageUrl) {
    try {
      await syncBlogImageToHomeGallery({
        blogSlug: slug,
        title: String(next.title ?? current.title),
        featuredImageUrl: String(next.featuredImageUrl),
        serviceSlug: String(next.serviceSlug ?? current.serviceSlug ?? ""),
        published: true,
      });
    } catch (e) {
      console.error("[blog-posts] gallery sync on image change:", e);
    }
  }

  if (published || publishNow || wasPublished) {
    revalidatePath(`/blog/${slug}`);
    revalidatePath("/blog");
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
