import { createHash } from "crypto";
import { appendSeoIntelLog } from "./activity-log";
import { canAutoApproveSuggestion } from "./settings";
import { getSeoIntelSettings } from "./settings";
import { listKeywords } from "./keywords-store";
import {
  createSuggestion,
  countAppliedToday,
  hasSimilarOpenSuggestion,
  saveSuggestion,
} from "./suggestions-store";
import type {
  SeoIntelKeyword,
  SeoIntelPriority,
  SeoIntelRiskLevel,
  SeoIntelSuggestion,
  SeoIntelSuggestionType,
} from "./types";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function parseTarget(
  kw: SeoIntelKeyword,
): {
  collection: "blogPosts" | "seoPages" | null;
  docId: string | null;
  pageType: SeoIntelSuggestion["pageType"];
} {
  const url = kw.existingPageUrl || kw.myUrl || "";
  if (url.includes("/blog/")) {
    const slug = url.split("/blog/")[1]?.split(/[?#]/)[0] || null;
    return { collection: slug ? "blogPosts" : null, docId: slug, pageType: "blog" };
  }
  if (url.includes("/guides/")) {
    const slug = url.split("/guides/")[1]?.split(/[?#]/)[0] || null;
    return {
      collection: slug ? "seoPages" : null,
      docId: slug,
      pageType: "guide",
    };
  }
  if (url.includes("/services/")) {
    return {
      collection: null,
      docId: null,
      pageType: "service_page",
    };
  }
  return {
    collection: null,
    docId: null,
    pageType: kw.recommendedContentType,
  };
}

function priorityFromScore(score: number): SeoIntelPriority {
  if (score >= 75) return "critical";
  if (score >= 60) return "high";
  if (score >= 45) return "medium";
  return "low";
}

function buildTitleProposal(keyword: string, current: string): string {
  const year = new Date().getFullYear();
  const base = keyword
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  const proposed = `${base} (${year}) | Book Scuba Goa`;
  if (proposed.length <= 60) return proposed;
  return `${base} | Book Scuba Goa`.slice(0, 60);
}

function buildMetaProposal(keyword: string): string {
  const text = `Plan ${keyword} with Book Scuba Goa — clear pricing, pickup options, and easy online booking. Check details and reserve your slot today.`;
  return text.slice(0, 158);
}

type Draft = Omit<
  SeoIntelSuggestion,
  "id" | "createdAt" | "updatedAt" | "status" | "autoApproved"
> & { status?: SeoIntelSuggestion["status"] };

function draftsForKeyword(kw: SeoIntelKeyword): Draft[] {
  const target = parseTarget(kw);
  const comps =
    (kw.competitorPreview ?? [])
      .map((c) => `${c.domain} (#${c.position ?? "?"})`)
      .join("; ") || "No competitor snapshot yet";
  const benefit =
    "Potential improvement: Medium. Confidence below. Ranking impact is not guaranteed.";
  const out: Draft[] = [];

  const base = {
    keywordId: kw.id,
    keyword: kw.keyword,
    targetPageId: kw.existingPageId,
    evidence: `Opportunity ${kw.opportunityScore}; page match ${kw.pageMatchStatus}; impressions ${kw.impressions ?? 0}`,
    competitorComparison: comps,
    expectedBenefit: benefit,
    editedByAdmin: false,
    rejectionReason: null,
    aiModel: null,
    estimatedCost: null,
    adminNotes: "",
    changeVersionId: null,
    applyError: null,
    approvedAt: null,
    appliedAt: null,
    rollbackAvailable: true,
  };

  if (kw.pageMatchStatus === "no_page") {
    const type: SeoIntelSuggestionType =
      kw.recommendedContentType === "service_page"
        ? "create_service_page"
        : "create_blog";
    const slug = slugify(kw.keyword);
    const path =
      type === "create_service_page"
        ? `/services/${slug}`
        : `/blog/${slug}`;
    const title = kw.keyword
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    const content = `## ${title}\n\nLooking for **${kw.keyword}**? Book Scuba Goa helps you plan a safe, clear experience in Goa with transparent details and easy booking.\n\n### What to expect\n- Clear inclusions and timing\n- Pickup options where available\n- Beginner-friendly guidance when relevant\n\n### Book online\n[Book now](/booking) · [View services](/services)\n\n*Content draft for admin review — verify facts before publishing.*`;
    out.push({
      ...base,
      targetUrl: path,
      targetCollection: type === "create_blog" ? "blogPosts" : null,
      targetDocId: type === "create_blog" ? slug : null,
      pageType: type === "create_blog" ? "blog" : "service_page",
      type,
      currentValue: "(no page)",
      proposedValue: content,
      proposedPatch:
        type === "create_blog"
          ? {
              slug,
              title,
              metaTitle: buildTitleProposal(kw.keyword, "").replace(
                " | Book Scuba Goa",
                "",
              ).slice(0, 60),
              metaDescription: buildMetaProposal(kw.keyword),
              excerpt: buildMetaProposal(kw.keyword).slice(0, 140),
              keywords: [kw.keyword, kw.category, "Goa"],
              content,
              faqs: [
                {
                  question: `Is ${kw.keyword} available with Book Scuba Goa?`,
                  answer:
                    "Check our services and booking page for current availability, inclusions, and pickup details.",
                },
                {
                  question: `How do I book ${kw.keyword}?`,
                  answer:
                    "Use the online booking form or WhatsApp from the site. Confirm date, guests, and pickup before paying.",
                },
              ],
              published: false,
              readTime: "5 min read",
            }
          : null,
      reason:
        type === "create_blog"
          ? "No suitable page exists. Draft an unpublished blog for admin review (will not go live until you publish)."
          : "No suitable page exists. Service page creation stays manual — review draft proposal only.",
      risk: type === "create_blog" ? "medium" : "high",
      priority: priorityFromScore(kw.opportunityScore),
      confidence: Math.min(88, 55 + Math.round(kw.opportunityScore / 4)),
      changeScope: type === "create_blog" ? "new_unpublished_blog" : "manual_only",
    });
    return out;
  }

  if (kw.pageMatchStatus === "cannibalisation") {
    out.push({
      ...base,
      targetUrl: kw.existingPageUrl || kw.myUrl || "",
      targetCollection: target.collection,
      targetDocId: target.docId,
      pageType: target.pageType,
      type: "fix_cannibalisation",
      currentValue: kw.pageMatchNote,
      proposedValue:
        "Keep one primary URL; consolidate overlapping pages with internal links. Do not delete ranking pages automatically.",
      proposedPatch: null,
      reason: "Multiple pages compete for this keyword.",
      risk: "high",
      priority: "high",
      confidence: 70,
      changeScope: "manual_review",
      rollbackAvailable: false,
    });
  }

  if (
    target.collection &&
    target.docId &&
    ["correct_page", "related_page", "weak_ranking", "wrong_page"].includes(
      kw.pageMatchStatus,
    )
  ) {
    const currentTitle = kw.existingPageUrl || "";
    out.push({
      ...base,
      targetUrl: kw.existingPageUrl || `/${target.collection}/${target.docId}`,
      targetCollection: target.collection,
      targetDocId: target.docId,
      pageType: target.pageType,
      type: "update_seo_title",
      currentValue: currentTitle,
      proposedValue: buildTitleProposal(kw.keyword, currentTitle),
      proposedPatch:
        target.collection === "blogPosts"
          ? {
              metaTitle: buildTitleProposal(kw.keyword, currentTitle),
              title: kw.keyword
                .split(" ")
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(" "),
            }
          : {
              metaTitle: buildTitleProposal(kw.keyword, currentTitle),
              headline: kw.keyword
                .split(" ")
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(" "),
            },
      reason:
        "Refresh SEO title / H1 for clearer intent match and CTR. Ranking impact is not guaranteed.",
      risk: "low",
      priority: priorityFromScore(kw.opportunityScore),
      confidence: 78,
      changeScope: "meta_title_h1",
    });

    out.push({
      ...base,
      targetUrl: kw.existingPageUrl || "",
      targetCollection: target.collection,
      targetDocId: target.docId,
      pageType: target.pageType,
      type: "update_meta_description",
      currentValue: "(current meta — see page)",
      proposedValue: buildMetaProposal(kw.keyword),
      proposedPatch: {
        metaDescription: buildMetaProposal(kw.keyword),
        ...(target.collection === "blogPosts"
          ? { excerpt: buildMetaProposal(kw.keyword).slice(0, 140) }
          : {}),
      },
      reason:
        "Stronger meta description with booking CTA. Estimated improvement potential: Medium — not guaranteed.",
      risk: "low",
      priority: priorityFromScore(kw.opportunityScore),
      confidence: 80,
      changeScope: "meta_description",
    });

    if (target.collection === "blogPosts") {
      out.push({
        ...base,
        targetUrl: kw.existingPageUrl || "",
        targetCollection: "blogPosts",
        targetDocId: target.docId,
        pageType: "blog",
        type: "add_faqs",
        currentValue: "(existing FAQs on page)",
        proposedValue: JSON.stringify(
          [
            {
              question: `What should I know before ${kw.keyword}?`,
              answer:
                "Confirm inclusions, timing, pickup, age/fitness requirements, and weather policy before booking.",
            },
            {
              question: `How do I book ${kw.keyword} online?`,
              answer:
                "Choose date and guests on the booking page, then complete payment. You will receive confirmation details after booking.",
            },
            {
              question: "Is pickup included?",
              answer:
                "Pickup depends on the package. Check the service page inclusions or ask on WhatsApp before you book.",
            },
          ],
          null,
          2,
        ),
        proposedPatch: {
          faqsMode: "merge",
          faqs: [
            {
              question: `What should I know before ${kw.keyword}?`,
              answer:
                "Confirm inclusions, timing, pickup, age/fitness requirements, and weather policy before booking.",
            },
            {
              question: `How do I book ${kw.keyword} online?`,
              answer:
                "Choose date and guests on the booking page, then complete payment. You will receive confirmation details after booking.",
            },
            {
              question: "Is pickup included?",
              answer:
                "Pickup depends on the package. Check the service page inclusions or ask on WhatsApp before you book.",
            },
          ],
        },
        reason: "Add useful FAQs + keep them visible for FAQ schema eligibility.",
        risk: "low",
        priority: "medium",
        confidence: 74,
        changeScope: "faqs_merge",
      });
    }

    out.push({
      ...base,
      targetUrl: kw.existingPageUrl || "",
      targetCollection: target.collection,
      targetDocId: target.docId,
      pageType: target.pageType,
      type: "add_internal_links",
      currentValue: "(body content)",
      proposedValue:
        "Add natural links to [/booking](/booking), [/services](/services), and related service/blog pages.",
      proposedPatch: {
        appendMarkdown: `\n\n### Plan your trip\n- [Book online](/booking)\n- [View all services](/services)\n- [Read more guides](/blog)\n`,
      },
      reason: "Strengthen internal linking for topical relevance.",
      risk: "low",
      priority: "medium",
      confidence: 72,
      changeScope: "append_internal_links",
    });
  }

  return out;
}

/**
 * Generate SEO suggestions for top opportunity keywords.
 * Defaults to pending_approval; may auto-approve only if settings allow.
 */
export async function generateSuggestions(opts?: {
  actor?: string;
  limitKeywords?: number;
}): Promise<{
  created: number;
  skipped: number;
  autoApproved: number;
  errors: string[];
}> {
  const actor = opts?.actor ?? "system";
  const settings = await getSeoIntelSettings();
  const keywords = await listKeywords({ status: "active" });
  const targets = [...keywords]
    .sort((a, b) => (b.opportunityScore ?? 0) - (a.opportunityScore ?? 0))
    .slice(0, opts?.limitKeywords ?? 40);

  let created = 0;
  let skipped = 0;
  let autoApproved = 0;
  const errors: string[] = [];
  let appliedToday = await countAppliedToday();

  for (const kw of targets) {
    const drafts = draftsForKeyword(kw);
    for (const draft of drafts) {
      try {
        const similar = await hasSimilarOpenSuggestion({
          keywordId: draft.keywordId,
          type: draft.type,
          targetUrl: draft.targetUrl,
        });
        if (similar) {
          skipped += 1;
          continue;
        }

        // Fingerprint id for stable dedupe
        const fp = createHash("sha256")
          .update(
            `${draft.type}|${draft.keywordId}|${draft.targetUrl}|${draft.proposedValue.slice(0, 80)}`,
          )
          .digest("hex")
          .slice(0, 24);

        let status: SeoIntelSuggestion["status"] = "pending_approval";
        let auto = false;
        const gate = canAutoApproveSuggestion({
          settings,
          suggestionType: draft.type,
          confidence: draft.confidence,
          risk: draft.risk as SeoIntelRiskLevel,
          impressions: kw.impressions,
          businessRelevance: kw.businessValueScore,
          changesAppliedToday: appliedToday,
        });
        if (gate.ok && draft.proposedPatch) {
          status = "auto_approved";
          auto = true;
        }

        await createSuggestion({
          ...draft,
          id: `sug_${fp}`,
          status,
          autoApproved: auto,
        });
        created += 1;
        if (auto) autoApproved += 1;
      } catch (e) {
        errors.push(e instanceof Error ? e.message : "create failed");
      }
    }
  }

  await appendSeoIntelLog({
    action: "suggestions.generate",
    entityType: "suggestion",
    actor,
    details: `Created ${created}; skipped ${skipped}; auto-approved ${autoApproved}`,
    result: "ok",
  });

  return { created, skipped, autoApproved, errors: errors.slice(0, 10) };
}

export async function updateSuggestionFields(
  id: string,
  patch: Partial<SeoIntelSuggestion>,
  actor: string,
): Promise<SeoIntelSuggestion> {
  const { getSuggestion } = await import("./suggestions-store");
  const current = await getSuggestion(id);
  if (!current) throw new Error("Suggestion not found");
  const next = await saveSuggestion({
    ...current,
    ...patch,
    id: current.id,
    editedByAdmin:
      patch.proposedValue != null ||
      patch.proposedPatch != null ||
      patch.adminNotes != null
        ? true
        : current.editedByAdmin,
    status:
      patch.status ||
      (patch.proposedValue != null || patch.proposedPatch != null
        ? "edited_by_admin"
        : current.status),
  });
  await appendSeoIntelLog({
    action: "suggestions.update",
    entityType: "suggestion",
    entityId: id,
    actor,
    details: `Updated suggestion ${id}`,
    result: "ok",
  });
  return next;
}
