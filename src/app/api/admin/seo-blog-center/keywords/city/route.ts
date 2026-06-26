import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  previewCityKeywords,
  saveCityKeywords,
} from "@/lib/seo-blog-center/pipeline";
import type { SeoBlogKeyword } from "@/lib/seo-blog-center/types";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: {
    city?: string;
    mode?: "preview" | "save";
    limit?: number;
    autoApprove?: boolean;
    keywords?: SeoBlogKeyword[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const city = body.city?.trim();
  if (!city) {
    return NextResponse.json({ error: "city required" }, { status: 400 });
  }

  if (body.mode === "save" && Array.isArray(body.keywords)) {
    const result = await saveCityKeywords(
      body.keywords,
      auth.uid,
      body.autoApprove === true,
    );
    return NextResponse.json({ ok: true, ...result });
  }

  const preview = await previewCityKeywords(city, body.limit ?? 80);
  return NextResponse.json({ ok: true, ...preview });
}
