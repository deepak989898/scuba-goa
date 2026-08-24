import { getAdminDb } from "@/lib/firebase-admin";
import { stripUndefinedDeep } from "@/lib/firestore-json";
import { runUrlInventoryDiscovery } from "./inventory";
import { processInspectionQueue } from "./inspect-queue";
import { processSafeAutoFixes } from "./auto-fix";
import { syncSearchAnalytics } from "./analytics-sync";
import { submitSitemapsIfDue } from "./sitemap-submit";
import { listSeoUrls } from "./store";
import { runTechnicalAuditForUrl } from "./audit";
import { getSeoSettings } from "./settings";
import { SEO_AGENT_RUNS } from "./store";
import { siteId } from "./normalize-url";

export type AgentJob =
  | "inventory"
  | "inspect"
  | "audit"
  | "auto_fix"
  | "analytics"
  | "sitemap"
  | "daily"
  | "weekly";

export async function runGscAgentJob(
  job: AgentJob,
): Promise<{ ok: boolean; job: AgentJob; detail: Record<string, unknown> }> {
  const settings = await getSeoSettings();
  const started = new Date().toISOString();
  let detail: Record<string, unknown> = {};
  let ok = true;

  try {
    if (settings.paused && job !== "inventory") {
      return {
        ok: true,
        job,
        detail: { paused: true, message: "Agent paused — only inventory allowed via force later" },
      };
    }

    switch (job) {
      case "inventory":
        detail = await runUrlInventoryDiscovery();
        break;
      case "inspect":
        detail = await processInspectionQueue(25);
        break;
      case "audit": {
        const urls = (await listSeoUrls({ limit: 400 }))
          .filter(
            (u) =>
              u.eligibleForIndexing &&
              (!u.httpStatus ||
                u.issueCodes.length > 0 ||
                u.indexStatus !== "INDEXED"),
          )
          .slice(0, 12);
        let audited = 0;
        for (const u of urls) {
          await runTechnicalAuditForUrl(u);
          audited += 1;
        }
        detail = { audited };
        break;
      }
      case "auto_fix":
        detail = await processSafeAutoFixes(20);
        break;
      case "analytics":
        detail = await syncSearchAnalytics();
        ok = !detail.error;
        break;
      case "sitemap":
        detail = await submitSitemapsIfDue(false);
        break;
      case "daily": {
        const inv = await runUrlInventoryDiscovery();
        const audit = await runGscAgentJob("audit");
        const inspect = await processInspectionQueue(6);
        const fixes = await processSafeAutoFixes(15);
        const analytics = await syncSearchAnalytics();
        const sm = await submitSitemapsIfDue(false);
        detail = { inv, audit: audit.detail, inspect, fixes, analytics, sm };
        break;
      }
      case "weekly": {
        const inv = await runUrlInventoryDiscovery();
        const analytics = await syncSearchAnalytics();
        const sm = await submitSitemapsIfDue(true);
        const inspect = await processInspectionQueue(15);
        detail = { inv, analytics, sm, inspect };
        break;
      }
      default:
        ok = false;
        detail = { error: "Unknown job" };
    }
  } catch (e) {
    ok = false;
    detail = { error: e instanceof Error ? e.message : "Job failed" };
  }

  const db = getAdminDb();
  if (db) {
    const id = `${started.slice(0, 10)}_${job}_${Date.now().toString(36)}`;
    await db.collection(SEO_AGENT_RUNS).doc(id).set(
      stripUndefinedDeep({
        id,
        job,
        ok,
        detail,
        startedAt: started,
        finishedAt: new Date().toISOString(),
        siteId: siteId(),
      }),
    );
  }

  return { ok, job, detail };
}
