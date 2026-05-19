import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  addTopicToQueue,
  deleteTopicQueueItem,
  listBlogTopicQueue,
  updateTopicQueueItem,
} from "@/lib/blog-automation/topics";
import type { BlogLanguage } from "@/lib/blog-firestore";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const items = await listBlogTopicQueue();
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  let body: {
    titles?: string[];
    title?: string;
    slug?: string;
    serviceSlug?: string;
    language?: BlogLanguage;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const titles: string[] = [];
  if (Array.isArray(body.titles)) {
    for (const t of body.titles) {
      const s = String(t).trim();
      if (s) titles.push(s);
    }
  }
  if (body.title?.trim()) titles.push(body.title.trim());
  if (titles.length === 0) {
    return NextResponse.json({ error: "No titles provided" }, { status: 400 });
  }

  const ids: string[] = [];
  for (const title of titles) {
    const id = await addTopicToQueue({
      title,
      slug: body.slug,
      serviceSlug: body.serviceSlug,
      language: body.language,
    });
    ids.push(id);
  }
  return NextResponse.json({ ids });
}

export async function PATCH(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  let body: {
    id?: string;
    title?: string;
    slug?: string;
    serviceSlug?: string;
    language?: BlogLanguage;
    order?: number;
    status?: "pending" | "skipped";
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  await updateTopicQueueItem(body.id, {
    ...(body.title != null ? { title: body.title } : {}),
    ...(body.slug != null ? { slug: body.slug } : {}),
    ...(body.serviceSlug != null ? { serviceSlug: body.serviceSlug } : {}),
    ...(body.language != null ? { language: body.language } : {}),
    ...(body.order != null ? { order: body.order } : {}),
    ...(body.status != null ? { status: body.status } : {}),
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  await deleteTopicQueueItem(id);
  return NextResponse.json({ ok: true });
}
