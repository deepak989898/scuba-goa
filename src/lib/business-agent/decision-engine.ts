import type {
  BusinessAgentAction,
  BusinessAgentActionRisk,
} from "@/lib/business-agent/types";
import { getAdminDb } from "@/lib/firebase-admin";
import { enforceSeoStringConstraints } from "@/lib/business-agent/safe-editor";

function safeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function getPathCollectionTarget(path: string): { collection: "seoPages" | "blogPosts" | "services" | null; docId: string } {
  if (path.startsWith("/guides/")) {
    const docId = path.replace("/guides/", "").trim();
    if (!docId) return { collection: null, docId: "" };
    return { collection: "seoPages", docId };
  }
  if (path.startsWith("/blog/")) {
    const docId = path.replace("/blog/", "").trim();
    if (!docId) return { collection: null, docId: "" };
    return { collection: "blogPosts", docId };
  }
  if (path.startsWith("/services/")) {
    const docId = path.replace("/services/", "").trim();
    if (!docId) return { collection: null, docId: "" };
    return { collection: "services", docId };
  }
  return { collection: null, docId: "" };
}

export async function decideBusinessActions(input: {
  dateIst: string;
  insights: { highTrafficLowConversion: { path: string; likelyIssue: string }[]; recommendations: string[] };
  conversionIssues?: unknown;
  maxActions?: number;
}): Promise<BusinessAgentAction[]> {
  const maxActions = input.maxActions ?? 8;
  const key = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.AI_ANALYTICS_OPENAI_MODEL?.trim() || "gpt-4o-mini";

  const db = getAdminDb();
  if (!db) return [];

  // Conservative v1: Use rule-based targeting + "meta updates" only.
  // If we want deeper content rewrites, we’ll require admin approval in later iterations.
  const candidates = input.insights.highTrafficLowConversion
    .filter((x) => x.path.startsWith("/guides/") || x.path.startsWith("/blog/") || x.path.startsWith("/services/"))
    .slice(0, maxActions);

  const actions: BusinessAgentAction[] = [];
  for (const c of candidates) {
    const t = getPathCollectionTarget(c.path);
    if (!t.collection) continue;
    const risk: BusinessAgentActionRisk = "safe";

    const existingSnap = await db.collection(t.collection).doc(t.docId).get();
    const existing = existingSnap.exists ? (existingSnap.data() as Record<string, unknown>) : null;

    const baseSystem =
      "You are an expert SEO copywriter for Book Scuba Goa (scuba diving in Goa). Use SIMPLE English. Be accurate and do not invent facts.";

    let promptFields: string[] = [];
    let userPrompt = "";
    if (t.collection === "seoPages") {
      promptFields = ["metaTitle", "metaDescription"];
      userPrompt = `Path: ${c.path}\nIssue: ${c.likelyIssue}\n\nCurrent:\n- headline: ${String(existing?.headline ?? "")}\n- metaTitle: ${String(existing?.metaTitle ?? "")}\n- metaDescription: ${String(existing?.metaDescription ?? "")}\n- bookingOption: ${String(existing?.bookingOption ?? "")}\n\nReturn JSON with:\n- metaTitle (<=60 chars, include main keyword + Goa benefit)\n- metaDescription (<=155 chars, include pricing/benefit + WhatsApp confirmation mention)\n`;
    } else if (t.collection === "blogPosts") {
      promptFields = ["metaTitle", "metaDescription"];
      userPrompt = `Path: ${c.path}\nIssue: ${c.likelyIssue}\n\nCurrent:\n- title: ${String(existing?.title ?? "")}\n- metaTitle: ${String(existing?.metaTitle ?? "")}\n- metaDescription: ${String(existing?.metaDescription ?? "")}\n- excerpt: ${String(existing?.excerpt ?? "")}\n\nReturn JSON with:\n- metaTitle (<=60 chars, include main keyword + Goa benefit)\n- metaDescription (<=155 chars, include booking help + /booking CTA)\n`;
    } else if (t.collection === "services") {
      promptFields = ["short"];
      userPrompt = `Path: ${c.path}\nIssue: ${c.likelyIssue}\n\nCurrent:\n- title: ${String(existing?.title ?? "")}\n- short: ${String(existing?.short ?? "")}\n- priceFrom: ${String(existing?.priceFrom ?? "")}\n\nReturn JSON with:\n- short (<=240 chars, clearer price/value + stronger next step to /booking)\n`;
    }

    let patch: Record<string, unknown> = {};
    if (key) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: `${baseSystem}\nReturn ONLY JSON.` },
            {
              role: "user",
              content:
                userPrompt +
                `\n\nJSON schema:\n{\n  ${promptFields
                  .map((f) => `"${f}": string`)
                  .join(",\n  ")}\n}\n`,
            },
          ],
          temperature: 0.4,
          max_tokens: 800,
          response_format: { type: "json_object" },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const raw = data?.choices?.[0]?.message?.content?.trim();
        if (raw) {
          try {
            patch = JSON.parse(raw) as Record<string, unknown>;
          } catch {
            patch = {};
          }
        }
      }
    }

    // If OpenAI is unavailable, create pending action with no patch.
    // Action engine will decide what to do.
    if (t.collection === "services") {
      patch = enforceSeoStringConstraints({ collection: t.collection, patch });
    } else if (t.collection === "seoPages") {
      patch = enforceSeoStringConstraints({ collection: t.collection, patch });
    } else {
      patch = enforceSeoStringConstraints({ collection: t.collection, patch });
    }

    actions.push({
      actionId: safeId("action"),
      runId: `run_${input.dateIst}`,
      createdAt: new Date().toISOString(),
      kind: t.collection === "services" ? "service_copy_update" : "seo_meta_update",
      risk,
      status: Object.keys(patch).length ? "proposed" : "failed",
      target: { collection: t.collection, docId: t.docId },
      patch,
      reason: c.likelyIssue,
    });
  }

  return actions;
}

