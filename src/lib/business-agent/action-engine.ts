import { getAdminDb } from "@/lib/firebase-admin";
import type {
  BusinessAgentAction,
  BusinessAgentRollbackHistoryDoc,
} from "@/lib/business-agent/types";
import { stripUndefinedDeep } from "@/lib/firestore-json";
import {
  enforceSeoStringConstraints,
  validatePatchFields,
} from "@/lib/business-agent/safe-editor";

export async function applyBusinessAgentAction(opts: {
  action: BusinessAgentAction;
}): Promise<{ ok: true; action: BusinessAgentAction } | { ok: false; error: string }> {
  const db = getAdminDb();
  if (!db) return { ok: false, error: "Firebase Admin not configured" };

  const action = opts.action;
  if (!action.patch || Object.keys(action.patch).length === 0) {
    return { ok: false, error: "Empty patch" };
  }

  const patch = enforceSeoStringConstraints({
    collection: action.target.collection,
    patch: action.patch,
  });

  const { safePatch, requiresApprovalPatch } = validatePatchFields({
    action,
    patch,
  });

  if (Object.keys(requiresApprovalPatch).length) {
    return {
      ok: false,
      error: `Action contains requires-approval fields: ${Object.keys(requiresApprovalPatch).join(", ")}`,
    };
  }

  const beforeSnap = await db
    .collection(action.target.collection)
    .doc(action.target.docId)
    .get();

  const before = beforeSnap.exists ? beforeSnap.data() ?? {} : {};

  const now = new Date().toISOString();

  // Basic rollback/version history
  const rollbackId = `rb_${action.actionId}_${Date.now()}`;
  const rollback: BusinessAgentRollbackHistoryDoc = {
    rollbackId,
    createdAt: now,
    runId: action.runId,
    target: { collection: action.target.collection, docId: action.target.docId },
    before: stripUndefinedDeep(before as Record<string, unknown>),
    after: stripUndefinedDeep(before as Record<string, unknown>),
    appliedPatch: stripUndefinedDeep(safePatch),
    reason: action.reason,
  };

  // Always set updatedAt for collections that expect it (best-effort)
  const patchWithTs: Record<string, unknown> = {
    ...safePatch,
    ...(action.target.collection === "seoPages" || action.target.collection === "blogPosts"
      ? { updatedAt: now }
      : {}),
  };

  // Apply
  try {
    await db
      .collection(action.target.collection)
      .doc(action.target.docId)
      .set(stripUndefinedDeep(patchWithTs), { merge: true });

    const afterSnap = await db
      .collection(action.target.collection)
      .doc(action.target.docId)
      .get();
    const after = afterSnap.exists ? (afterSnap.data() ?? {}) : {};

    rollback.after = stripUndefinedDeep(after as Record<string, unknown>);
    await db.collection("businessAgentRollbackHistory").doc(rollbackId).set(rollback);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }

  return {
    ok: true,
    action: {
      ...action,
      status: "applied",
      appliedAt: now,
      lastRollbackId: rollbackId,
    },
  };
}

export async function applyBusinessAgentActionAfterApproval(opts: {
  action: BusinessAgentAction;
}): Promise<{ ok: true; action: BusinessAgentAction } | { ok: false; error: string }> {
  const db = getAdminDb();
  if (!db) return { ok: false, error: "Firebase Admin not configured" };

  const action = opts.action;
  if (!action.patch || Object.keys(action.patch).length === 0) {
    return { ok: false, error: "Empty patch" };
  }

  const patch = enforceSeoStringConstraints({
    collection: action.target.collection,
    patch: action.patch,
  });

  const { safePatch, requiresApprovalPatch } = validatePatchFields({
    action,
    patch,
  });

  const mergedPatch: Record<string, unknown> = {
    ...safePatch,
    ...requiresApprovalPatch,
  };

  const beforeSnap = await db
    .collection(action.target.collection)
    .doc(action.target.docId)
    .get();

  const before = beforeSnap.exists ? beforeSnap.data() ?? {} : {};

  const now = new Date().toISOString();

  const rollbackId = `rb_${action.actionId}_${Date.now()}`;
  const rollback: BusinessAgentRollbackHistoryDoc = {
    rollbackId,
    createdAt: now,
    runId: action.runId,
    target: { collection: action.target.collection, docId: action.target.docId },
    before: stripUndefinedDeep(before as Record<string, unknown>),
    after: stripUndefinedDeep(before as Record<string, unknown>),
    appliedPatch: stripUndefinedDeep(mergedPatch),
    reason: action.reason,
  };

  const patchWithTs: Record<string, unknown> = {
    ...mergedPatch,
    ...(action.target.collection === "seoPages" || action.target.collection === "blogPosts"
      ? { updatedAt: now }
      : {}),
  };

  try {
    await db
      .collection(action.target.collection)
      .doc(action.target.docId)
      .set(stripUndefinedDeep(patchWithTs), { merge: true });

    const afterSnap = await db
      .collection(action.target.collection)
      .doc(action.target.docId)
      .get();
    const after = afterSnap.exists ? (afterSnap.data() ?? {}) : {};

    rollback.after = stripUndefinedDeep(after as Record<string, unknown>);
    await db.collection("businessAgentRollbackHistory").doc(rollbackId).set(rollback);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }

  return {
    ok: true,
    action: {
      ...action,
      status: "applied",
      appliedAt: now,
      lastRollbackId: rollbackId,
    },
  };
}

export async function rollbackBusinessAgent(opts: {
  rollbackId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = getAdminDb();
  if (!db) return { ok: false, error: "Firebase Admin not configured" };

  const snap = await db
    .collection("businessAgentRollbackHistory")
    .doc(opts.rollbackId)
    .get();
  if (!snap.exists) return { ok: false, error: "Rollback not found" };
  const rb = snap.data() as BusinessAgentRollbackHistoryDoc;

  const { collection, docId } = rb.target;
  try {
    await db.collection(collection).doc(docId).set(rb.before ?? {}, { merge: false });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

