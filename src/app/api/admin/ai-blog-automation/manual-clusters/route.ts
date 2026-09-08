import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { runAutoApprovePublishAutomation } from "@/lib/seo-blog-center/auto-approve-publish";
import { createManualClustersFromTitles } from "@/lib/seo-blog-center/manual-clusters";
import {
  addSeoBlogLog,
  saveCluster,
  saveKeyword,
} from "@/lib/seo-blog-center/store";
import { getAllServicesServer } from "@/lib/get-services-server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: {
    titles?: string | string[];
    serviceSlug?: string;
    serviceName?: string;
    language?: "en" | "hi" | "both";
    excludeCovered?: boolean;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawTitles = Array.isArray(body.titles)
    ? body.titles
    : typeof body.titles === "string"
      ? body.titles.split(/\r?\n/)
      : [];
  const titles = rawTitles.map((t) => String(t).trim()).filter(Boolean);
  if (titles.length === 0) {
    return NextResponse.json(
      { error: "Add at least one title (one per line)" },
      { status: 400 },
    );
  }

  const services = await getAllServicesServer();
  const service =
    services.find((s) => s.slug === body.serviceSlug) || services[0];

  const actorId = auth.uid || "admin";
  const result = await createManualClustersFromTitles({
    titles,
    serviceSlug: body.serviceSlug?.trim() || service?.slug || "scuba-diving",
    serviceName: body.serviceName?.trim() || service?.title,
    language:
      body.language === "hi" || body.language === "both" ? body.language : "en",
    actorId,
    excludeCovered: body.excludeCovered !== false,
  });

  if (result.keywords.length === 0) {
    return NextResponse.json(
      {
        error: "No clusters created",
        skipped: result.skipped,
      },
      { status: 400 },
    );
  }

  for (const kw of result.keywords) await saveKeyword(kw);
  for (const cl of result.clusters) await saveCluster(cl);

  await addSeoBlogLog({
    type: "research_run",
    message: `Manual titles ${result.researchJobId}: ${result.clusters.length} cluster(s) from ${titles.length} title(s)`,
    resourceId: result.researchJobId,
  });

  let autoApprove: Awaited<ReturnType<typeof runAutoApprovePublishAutomation>> | null =
    null;
  try {
    autoApprove = await runAutoApprovePublishAutomation(actorId);
  } catch {
    /* automation optional */
  }

  return NextResponse.json({
    ok: true,
    ...result,
    autoApprove,
  });
}
