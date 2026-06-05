import { getAdminDb } from "@/lib/firebase-admin";

export async function sendRecoveryWhatsApp(opts: {
  phone: string;
  message: string;
  leadId?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.META_WHATSAPP_TOKEN?.trim();
  const phoneId = process.env.META_WHATSAPP_PHONE_NUMBER_ID?.trim();
  const to = opts.phone.replace(/\D/g, "");
  if (!token || !phoneId || !to) {
    return { ok: false, error: "WhatsApp Cloud API not configured" };
  }

  const db = getAdminDb();
  const now = new Date().toISOString();

  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: opts.message.slice(0, 4000) },
      }),
    });

    const ok = res.ok;
    const errBody = await res.text().catch(() => "");

    if (db) {
      await db.collection("recoveryWhatsappEvents").add({
        direction: "outbound",
        phone: to,
        leadId: opts.leadId,
        message: opts.message.slice(0, 2000),
        status: ok ? "sent" : "failed",
        createdAt: now,
      });
    }

    if (!ok) {
      return { ok: false, error: errBody.slice(0, 300) || "WhatsApp send failed" };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (db) {
      await db.collection("recoveryWhatsappEvents").add({
        direction: "outbound",
        phone: to,
        leadId: opts.leadId,
        message: opts.message.slice(0, 2000),
        status: "failed",
        createdAt: now,
      });
    }
    return { ok: false, error: msg };
  }
}

export async function countOutboundWhatsAppLastHour(phone: string): Promise<number> {
  const db = getAdminDb();
  if (!db) return 0;
  const since = new Date(Date.now() - 3600_000).toISOString();
  const snap = await db
    .collection("recoveryWhatsappEvents")
    .where("phone", "==", phone.replace(/\D/g, ""))
    .where("direction", "==", "outbound")
    .limit(20)
    .get()
    .catch(() => null);
  if (!snap) return 0;
  return snap.docs.filter((d) => String(d.data().createdAt ?? "") >= since).length;
}
