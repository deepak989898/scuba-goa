import { createHash } from "crypto";
import webpush from "web-push";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";

export type PushSubscriptionKeys = {
  p256dh: string;
  auth: string;
};

export type PushSubscriptionRecord = {
  endpoint: string;
  keys: PushSubscriptionKeys;
};

export function getVapidPublicKey(): string | null {
  const key = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY?.trim();
  return key || null;
}

export function isWebPushConfigured(): boolean {
  const pub = getVapidPublicKey();
  const priv = process.env.WEB_PUSH_VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.WEB_PUSH_VAPID_SUBJECT?.trim();
  return Boolean(pub && priv && subject);
}

function ensureWebPushConfigured(): void {
  if (!isWebPushConfigured()) {
    throw new Error(
      "Web push is not configured. Set NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY, WEB_PUSH_VAPID_PRIVATE_KEY, and WEB_PUSH_VAPID_SUBJECT.",
    );
  }
  webpush.setVapidDetails(
    process.env.WEB_PUSH_VAPID_SUBJECT!.trim(),
    getVapidPublicKey()!,
    process.env.WEB_PUSH_VAPID_PRIVATE_KEY!.trim(),
  );
}

export function subscriptionDocId(endpoint: string): string {
  return createHash("sha256").update(endpoint).digest("hex");
}

function sliceStr(raw: unknown, max: number): string | undefined {
  return typeof raw === "string" ? raw.trim().slice(0, max) || undefined : undefined;
}

export async function upsertPushSubscription(input: {
  subscription: PushSubscriptionRecord;
  sessionId: string;
  visitorId?: string;
  userAgent?: string;
}): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Database unavailable");

  const endpoint = input.subscription.endpoint.trim();
  const p256dh = input.subscription.keys.p256dh.trim();
  const auth = input.subscription.keys.auth.trim();
  if (!endpoint || !p256dh || !auth) {
    throw new Error("Invalid push subscription");
  }

  const sessionId = sliceStr(input.sessionId, 128) || "anon";
  const visitorId = sliceStr(input.visitorId, 128);
  const userAgent = sliceStr(input.userAgent, 512);
  const docId = subscriptionDocId(endpoint);
  const subRef = db.collection("pushSubscriptions").doc(docId);
  const sessionRef = db.collection("analyticsSessions").doc(sessionId);

  let leadName: string | undefined;
  let leadEmail: string | undefined;
  let leadPhone: string | undefined;

  try {
    const sessionSnap = await sessionRef.get();
    if (sessionSnap.exists) {
      const data = sessionSnap.data() as Record<string, unknown>;
      leadName = sliceStr(data.leadName, 120);
      leadEmail = sliceStr(data.leadEmail, 160);
      leadPhone = sliceStr(data.leadPhone, 32);
    }
  } catch {
    /* optional enrichment */
  }

  const payload: Record<string, unknown> = {
    endpoint,
    keys: { p256dh, auth },
    sessionId,
    pushEnabled: true,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (visitorId) payload.visitorId = visitorId;
  if (userAgent) payload.userAgent = userAgent;
  if (leadName) payload.leadName = leadName;
  if (leadEmail) payload.leadEmail = leadEmail;
  if (leadPhone) payload.leadPhone = leadPhone;

  const existing = await subRef.get();
  if (!existing.exists) {
    payload.optedInAt = FieldValue.serverTimestamp();
  }

  await subRef.set(payload, { merge: true });

  const sessionPatch: Record<string, unknown> = {
    sessionId,
    pushEnabled: true,
    pushSubscribedAt: FieldValue.serverTimestamp(),
  };
  if (visitorId) sessionPatch.visitorId = visitorId;
  await sessionRef.set(sessionPatch, { merge: true });
}

export async function getPushSubscriberStats(): Promise<{
  total: number;
  configured: boolean;
}> {
  const db = getAdminDb();
  if (!db) return { total: 0, configured: isWebPushConfigured() };

  const snap = await db.collection("pushSubscriptions").count().get();
  return {
    total: snap.data().count,
    configured: isWebPushConfigured(),
  };
}

export type PushSendResult = {
  sent: number;
  failed: number;
  removed: number;
  errors: string[];
};

export async function sendPushCampaign(input: {
  title: string;
  body: string;
  url?: string;
}): Promise<PushSendResult> {
  ensureWebPushConfigured();
  const db = getAdminDb();
  if (!db) throw new Error("Database unavailable");

  const title = input.title.trim().slice(0, 80);
  const body = input.body.trim().slice(0, 300);
  const url = normalizePushUrl(input.url);
  if (!title || !body) throw new Error("Title and description are required");

  const snap = await db.collection("pushSubscriptions").get();
  const payload = JSON.stringify({ title, body, url });

  let sent = 0;
  let failed = 0;
  let removed = 0;
  const errors: string[] = [];

  const docs = snap.docs;
  const batchSize = 15;
  for (let i = 0; i < docs.length; i += batchSize) {
    const chunk = docs.slice(i, i + batchSize);
    await Promise.all(
      chunk.map(async (doc) => {
        const data = doc.data() as Record<string, unknown>;
        const endpoint = String(data.endpoint ?? "");
        const keys = data.keys as PushSubscriptionKeys | undefined;
        if (!endpoint || !keys?.p256dh || !keys?.auth) {
          failed += 1;
          return;
        }
        try {
          await webpush.sendNotification(
            {
              endpoint,
              keys: { p256dh: keys.p256dh, auth: keys.auth },
            },
            payload,
          );
          sent += 1;
        } catch (e: unknown) {
          failed += 1;
          const status =
            e &&
            typeof e === "object" &&
            "statusCode" in e &&
            typeof (e as { statusCode?: number }).statusCode === "number"
              ? (e as { statusCode: number }).statusCode
              : 0;
          if (status === 404 || status === 410) {
            try {
              await doc.ref.delete();
              removed += 1;
            } catch {
              /* ignore */
            }
          } else {
            const msg =
              e instanceof Error ? e.message : "Push send failed";
            if (errors.length < 5) errors.push(msg);
          }
        }
      }),
    );
  }

  await db.collection("pushCampaigns").add({
    title,
    body,
    url,
    sent,
    failed,
    removed,
    createdAt: FieldValue.serverTimestamp(),
  });

  return { sent, failed, removed, errors };
}

function normalizePushUrl(raw: string | undefined): string {
  const fallback = "/";
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return trimmed.slice(0, 512);
  }
  try {
    const site = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://www.bookscubagoa.com";
    const base = new URL(site);
    const parsed = new URL(trimmed, base);
    if (parsed.origin !== base.origin) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`.slice(0, 512) || fallback;
  } catch {
    return fallback;
  }
}
