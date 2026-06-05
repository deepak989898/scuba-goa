import type { AgentSnapshot, MasterAiOutput } from "@/lib/command-center/types";

export async function runMasterCoordinator(opts: {
  dateIst: string;
  snapshots: AgentSnapshot[];
  memorySummaries: Record<string, string[]>;
  pendingApprovals: number;
}): Promise<MasterAiOutput | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;

  const model = process.env.AI_ANALYTICS_OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bookscubagoa.com";

  const system = `You are the Master AI Coordinator for Book Scuba Goa (${site}).

You orchestrate 7 specialized agents: SEO, Analytics, Booking, Marketing, Reputation, Competitor, Pricing.

Rules:
- Coordinate agents — share insights between them (e.g. analytics → marketing, reputation → SEO).
- Prioritize revenue and bookings without harming trust.
- Flag conflicts (discount vs trust, SEO vs aggressive ads).
- Create actionable tasks with clear priority.
- Use business memory for context.
- Simple English for the business owner.`;

  const user = `Date (IST): ${opts.dateIst}
Pending approvals across agents: ${opts.pendingApprovals}

AGENT SNAPSHOTS:
${JSON.stringify(opts.snapshots).slice(0, 8000)}

BUSINESS MEMORY (recent):
${JSON.stringify(opts.memorySummaries).slice(0, 3000)}

Return JSON only:
{
  "headline": "one-line command center headline",
  "summaryMarkdown": "Daily ops brief with ## sections: Executive summary, Agent status, Top priorities, Cross-agent insights, Revenue & bookings, SEO, Marketing, Reputation, Pricing, Approval queue, Tomorrow checklist",
  "summaryPlain": "WhatsApp summary max 900 chars",
  "topPriorities": ["5-8 prioritized actions"],
  "decisions": [
    {
      "title": "",
      "reasoning": "",
      "affectedAgents": ["seo|analytics|booking|marketing|reputation|competitor|pricing"],
      "priority": "critical|high|medium|low",
      "requiresApproval": true,
      "relatedTaskIds": []
    }
  ],
  "insights": [
    {
      "fromAgent": "analytics",
      "toAgents": ["marketing"],
      "topic": "",
      "message": "",
      "priority": "high|medium|low"
    }
  ],
  "alerts": [
    {
      "severity": "info|warning|critical",
      "title": "",
      "message": "",
      "agentId": "analytics"
    }
  ],
  "tasks": [
    {
      "agentId": "marketing",
      "priority": "high",
      "title": "",
      "description": ""
    }
  ]
}

Decisions: 3-8. Insights: 5-12 (cross-agent). Alerts: 2-6. Tasks: 5-15.`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.35,
      max_tokens: 3500,
      response_format: { type: "json_object" },
    }),
  });

  const data = await res.json();
  if (!res.ok) return null;

  const raw = data?.choices?.[0]?.message?.content?.trim();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<MasterAiOutput>;
    return {
      headline: String(parsed.headline ?? "Command center report").trim(),
      summaryMarkdown: String(parsed.summaryMarkdown ?? "").trim(),
      summaryPlain: String(parsed.summaryPlain ?? "").trim().slice(0, 900),
      topPriorities: Array.isArray(parsed.topPriorities)
        ? parsed.topPriorities.map(String).slice(0, 12)
        : [],
      decisions: Array.isArray(parsed.decisions) ? parsed.decisions.slice(0, 12) : [],
      insights: Array.isArray(parsed.insights) ? parsed.insights.slice(0, 20) : [],
      alerts: Array.isArray(parsed.alerts) ? parsed.alerts.slice(0, 12) : [],
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks.slice(0, 20) : [],
    };
  } catch {
    return null;
  }
}
