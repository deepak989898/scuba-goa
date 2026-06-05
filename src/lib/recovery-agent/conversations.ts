import { getAdminDb } from "@/lib/firebase-admin";
import type { RecoveryConversationDoc } from "@/lib/recovery-agent/types";

export async function loadConversation(
  sessionId: string,
): Promise<RecoveryConversationDoc | null> {
  const db = getAdminDb();
  if (!db || !sessionId) return null;
  const id = `conv_${sessionId}`;
  const snap = await db.collection("recoveryConversations").doc(id).get();
  if (!snap.exists) return null;
  return snap.data() as RecoveryConversationDoc;
}

export async function appendConversationMessage(opts: {
  sessionId: string;
  language: string;
  role: "user" | "assistant";
  text: string;
  leadId?: string;
}): Promise<void> {
  const db = getAdminDb();
  if (!db || !opts.sessionId) return;

  const id = `conv_${opts.sessionId}`;
  const now = new Date().toISOString();
  const ref = db.collection("recoveryConversations").doc(id);
  const snap = await ref.get();

  const prev = snap.exists ? (snap.data() as RecoveryConversationDoc) : null;
  const messages = [...(prev?.messages ?? []), { role: opts.role, text: opts.text, at: now }].slice(
    -40,
  );

  await ref.set(
    {
      conversationId: id,
      sessionId: opts.sessionId,
      leadId: opts.leadId ?? prev?.leadId,
      language: opts.language,
      messages,
      createdAt: prev?.createdAt ?? now,
      updatedAt: now,
    },
    { merge: true },
  );

  await db.collection("recoveryAiResponses").add({
    sessionId: opts.sessionId,
    role: opts.role,
    text: opts.text.slice(0, 2000),
    createdAt: now,
  });
}
