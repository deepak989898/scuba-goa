import { getAdminDb } from "@/lib/firebase-admin";
import { stripUndefinedDeep } from "@/lib/firestore-json";
import type { CommandCenterTask } from "@/lib/command-center/types";

function newTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function enqueueTasks(
  dateIst: string,
  tasks: Omit<CommandCenterTask, "taskId" | "dateIst" | "createdAt" | "status">[],
): Promise<string[]> {
  const db = getAdminDb();
  if (!db || !tasks.length) return [];

  const ids: string[] = [];
  const now = new Date().toISOString();
  const batch = db.batch();

  for (const t of tasks.slice(0, 25)) {
    const taskId = newTaskId();
    ids.push(taskId);
    const doc: CommandCenterTask = {
      taskId,
      dateIst,
      agentId: t.agentId,
      priority: t.priority,
      status: "queued",
      title: t.title.slice(0, 200),
      description: t.description.slice(0, 1000),
      sourceActionId: t.sourceActionId,
      sourceCollection: t.sourceCollection,
      createdAt: now,
    };
    batch.set(db.collection("commandCenterTasks").doc(taskId), stripUndefinedDeep(doc));
  }

  await batch.commit();
  return ids;
}

export async function syncPendingApprovalTasks(dateIst: string): Promise<number> {
  const db = getAdminDb();
  if (!db) return 0;

  const tasks: Omit<CommandCenterTask, "taskId" | "dateIst" | "createdAt" | "status">[] = [];

  const [biz, mkt] = await Promise.all([
    db.collection("businessAgentActions").get(),
    db.collection("marketingAgentActions").get(),
  ]);

  for (const d of biz.docs) {
    const a = d.data() as { status?: string; kind?: string; reason?: string; actionId?: string };
    if (a.status !== "pending_approval") continue;
    tasks.push({
      agentId: "seo",
      priority: "high",
      title: `Approve: ${a.kind ?? "business action"}`,
      description: String(a.reason ?? ""),
      sourceActionId: a.actionId ?? d.id,
      sourceCollection: "businessAgentActions",
    });
  }

  for (const d of mkt.docs) {
    const a = d.data() as { status?: string; kind?: string; reason?: string; actionId?: string };
    if (a.status !== "pending_approval") continue;
    tasks.push({
      agentId: "marketing",
      priority: "high",
      title: `Approve: ${a.kind ?? "marketing action"}`,
      description: String(a.reason ?? ""),
      sourceActionId: a.actionId ?? d.id,
      sourceCollection: "marketingAgentActions",
    });
  }

  const ids = await enqueueTasks(dateIst, tasks);
  return ids.length;
}
