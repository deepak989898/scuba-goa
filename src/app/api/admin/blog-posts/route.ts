import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { parseBlogPostFromFirestore } from "@/lib/blog-firestore";

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
  let body: { slug?: string; published?: boolean; title?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const slug = body.slug?.trim();
  if (!slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }
  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }
  const patch: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };
  if (typeof body.published === "boolean") patch.published = body.published;
  if (body.title?.trim()) patch.title = body.title.trim();
  await db.collection("blogPosts").doc(slug).update(patch);
  return NextResponse.json({ ok: true });
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
