import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { queueSeoTopicCluster } from "@/lib/seo-agent/queue-topic-cluster";

export const runtime = "nodejs";

/** Queue SEO AI topic-cluster titles into blog automation. */
export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const result = await queueSeoTopicCluster();
    return NextResponse.json({
      ok: true,
      ...result,
      message:
        result.added.length > 0
          ? `Queued ${result.added.length} topic(s) for blog automation.`
          : "All suggested topics were already in the queue.",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to queue topics";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
