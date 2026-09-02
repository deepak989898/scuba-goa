import {
  getOrCreateAnalyticsSessionId,
  getOrCreateAnalyticsVisitorId,
} from "@/lib/analytics-client-ids";

const DISMISS_SESSION_KEY = "bsg_push_prompt_dismissed";
const SUBSCRIBED_KEY = "bsg_push_subscribed";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    out[i] = raw.charCodeAt(i);
  }
  return out;
}

export function getWebPushPublicKey(): string | null {
  const key = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY?.trim();
  return key || null;
}

export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    Boolean(getWebPushPublicKey())
  );
}

export function isPushPromptDismissedThisSession(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissPushPromptForSession(): void {
  try {
    sessionStorage.setItem(DISMISS_SESSION_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function markPushSubscribedLocally(): void {
  try {
    localStorage.setItem(SUBSCRIBED_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function hasPushSubscribedLocally(): boolean {
  try {
    return localStorage.getItem(SUBSCRIBED_KEY) === "1";
  } catch {
    return false;
  }
}

async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration("/");
    if (existing) return existing;
    return await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
  } catch {
    return null;
  }
}

export async function subscribeToWebPush(): Promise<{
  ok: boolean;
  reason?: string;
}> {
  if (!isPushSupported()) {
    return { ok: false, reason: "not_supported" };
  }

  const vapid = getWebPushPublicKey();
  if (!vapid) return { ok: false, reason: "not_configured" };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, reason: permission === "denied" ? "denied" : "dismissed" };
  }

  const reg = await ensureServiceWorker();
  if (!reg) return { ok: false, reason: "sw_failed" };

  await navigator.serviceWorker.ready;

  let subscription = await reg.pushManager.getSubscription();
  if (!subscription) {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid) as BufferSource,
    });
  }

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, reason: "invalid_subscription" };
  }

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: getOrCreateAnalyticsSessionId(),
      visitorId: getOrCreateAnalyticsVisitorId(),
      subscription: {
        endpoint: json.endpoint,
        keys: {
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
        },
      },
    }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    return { ok: false, reason: data?.error || "save_failed" };
  }

  markPushSubscribedLocally();
  return { ok: true };
}

export async function hasActivePushSubscription(): Promise<boolean> {
  if (!isPushSupported()) return false;
  if (Notification.permission !== "granted") return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration("/");
    if (!reg) return hasPushSubscribedLocally();
    const sub = await reg.pushManager.getSubscription();
    return Boolean(sub);
  } catch {
    return hasPushSubscribedLocally();
  }
}
