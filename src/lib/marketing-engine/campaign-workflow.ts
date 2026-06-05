import { getAdminDb } from "@/lib/firebase-admin";
import { addTopicToQueue } from "@/lib/blog-automation/topics";
import type { BlogLanguage } from "@/lib/blog-firestore";
import { stripUndefinedDeep } from "@/lib/firestore-json";
import type { MarketingAgentAction } from "@/lib/marketing-engine/types";

export async function applyMarketingAgentAction(action: MarketingAgentAction): Promise<{
  ok: boolean;
  action: MarketingAgentAction;
  error?: string;
}> {
  const db = getAdminDb();
  if (!db) return { ok: false, action, error: "Firebase Admin not configured" };

  const now = new Date().toISOString();

  try {
    if (action.kind === "queue_blog_topics") {
      const topics = (action.payload.topics ?? []) as {
        title: string;
        serviceSlug?: string;
        language?: string;
      }[];
      for (const t of topics) {
        if (!t.title?.trim()) continue;
        const lang = t.language as BlogLanguage | undefined;
        await addTopicToQueue({
          title: t.title.trim(),
          serviceSlug: t.serviceSlug,
          language: lang === "en" || lang === "hi" || lang === "hinglish" ? lang : "hinglish",
        });
      }
    } else if (action.kind === "publish_social_campaign" || action.kind === "schedule_google_business") {
      const campaignId = String(action.campaignId ?? action.payload.campaignId ?? "");
      if (campaignId) {
        await db.collection("marketingCampaigns").doc(campaignId).set(
          { status: "published", publishedAt: now, updatedAt: now },
          { merge: true },
        );
        const postIds = (action.payload.postIds ?? []) as string[];
        for (const postId of postIds) {
          await db.collection("marketingSocialPosts").doc(postId).set(
            { status: "published", publishedAt: now },
            { merge: true },
          );
        }
      }
    } else if (action.kind === "whatsapp_broadcast") {
      const campaignId = String(action.campaignId ?? "");
      if (campaignId) {
        await db.collection("marketingCampaigns").doc(campaignId).set(
          { status: "published", publishedAt: now, updatedAt: now },
          { merge: true },
        );
      }
    }

    const updated: MarketingAgentAction = {
      ...action,
      status: "applied",
      appliedAt: now,
    };
    await db.collection("marketingAgentActions").doc(action.actionId).set(stripUndefinedDeep(updated), { merge: true });
    return { ok: true, action: updated };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const failed: MarketingAgentAction = { ...action, status: "failed", error: msg };
    await db.collection("marketingAgentActions").doc(action.actionId).set(stripUndefinedDeep(failed), { merge: true });
    return { ok: false, action: failed, error: msg };
  }
}

export async function approveMarketingAction(actionId: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const db = getAdminDb();
  if (!db) return { ok: false, error: "Firebase Admin not configured" };

  const snap = await db.collection("marketingAgentActions").doc(actionId).get();
  if (!snap.exists) return { ok: false, error: "Action not found" };

  const action = snap.data() as MarketingAgentAction;
  if (action.status !== "pending_approval") {
    return { ok: false, error: `Action status is ${action.status}` };
  }

  const approved: MarketingAgentAction = {
    ...action,
    status: "approved",
    approvedAt: new Date().toISOString(),
  };
  await db.collection("marketingAgentActions").doc(actionId).set(stripUndefinedDeep(approved), { merge: true });

  const res = await applyMarketingAgentAction(approved);
  return res.ok ? { ok: true } : { ok: false, error: res.error };
}

export async function rejectMarketingAction(actionId: string): Promise<{ ok: boolean; error?: string }> {
  const db = getAdminDb();
  if (!db) return { ok: false, error: "Firebase Admin not configured" };

  const snap = await db.collection("marketingAgentActions").doc(actionId).get();
  if (!snap.exists) return { ok: false, error: "Action not found" };

  await db.collection("marketingAgentActions").doc(actionId).set(
    { status: "rejected", rejectedAt: new Date().toISOString() },
    { merge: true },
  );
  return { ok: true };
}
