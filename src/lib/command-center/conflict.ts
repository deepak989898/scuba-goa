import type { MasterAiOutput } from "@/lib/command-center/types";

/**
 * Prevent conflicting automated decisions (e.g. heavy discount + trust-focused SEO).
 * Drops lower-priority conflicting tasks when conflictPrevention is enabled.
 */
export function resolveConflicts(
  output: MasterAiOutput,
  enabled: boolean,
): MasterAiOutput {
  if (!enabled) return output;

  const hasTrustFocus = output.decisions.some(
    (d) =>
      d.title.toLowerCase().includes("trust") ||
      d.reasoning.toLowerCase().includes("reputation"),
  );
  const hasAggressiveDiscount = output.tasks.some(
    (t) =>
      t.agentId === "pricing" &&
      (t.title.toLowerCase().includes("discount") ||
        t.description.toLowerCase().includes("heavy discount")),
  );

  if (hasTrustFocus && hasAggressiveDiscount) {
    output.tasks = output.tasks.filter(
      (t) =>
        !(
          t.agentId === "pricing" &&
          t.priority === "low" &&
          t.title.toLowerCase().includes("discount")
        ),
    );
    output.insights.push({
      fromAgent: "pricing",
      toAgents: ["marketing", "reputation"],
      topic: "conflict_resolution",
      message:
        "Deferred aggressive discount task — reputation/trust improvements take priority this cycle.",
      priority: "medium",
    });
  }

  return output;
}
