import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  generateAndPublishOneBlog,
  runBlogAutomationCron,
} from "@/lib/blog-automation/generate-post";
import type { BlogLanguage } from "@/lib/blog-firestore";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: {
    title?: string;
    serviceSlug?: string;
    language?: BlogLanguage;
    runDaily?: boolean;
    /** Run cron logic: publish one post for the next due IST slot only. */
    runNextSlot?: boolean;
  } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body ok */
  }

  try {
    if (body.runNextSlot) {
      const result = await runBlogAutomationCron();
      return NextResponse.json({ ok: true, ...result });
    }

    if (body.runDaily) {
      const result = await runBlogAutomationCron({ forceAllRemaining: true });
      return NextResponse.json({ ok: true, ...result });
    }

    const result = await generateAndPublishOneBlog({
      forceTitle: body.title,
      forceServiceSlug: body.serviceSlug,
      language: body.language,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, slug: result.slug, title: result.title });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
