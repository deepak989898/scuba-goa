import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { brandAndUploadBlogImageBuffer } from "@/lib/blog-automation/images";
import { isValidBlogSlug, normalizeBlogSlugInput } from "@/lib/blog-firestore";

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
    return NextResponse.json({ ok: true, ...urls });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
