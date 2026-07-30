"use client";

import type { ReactNode } from "react";

/**
 * Lightweight markdown renderer for AI analytics reports.
 * Uses distinct heading colors so admins can scan sections quickly.
 */
function headingClass(title: string, level: 1 | 2 | 3): string {
  const t = title.trim().toLowerCase();
  const base =
    level === 1
      ? "mt-0 text-xl font-bold"
      : level === 2
        ? "mt-5 border-b pb-1.5 text-base font-bold first:mt-0"
        : "mt-4 text-sm font-bold";

  if (t.includes("summary") || t.includes("executive")) {
    return `${base} border-sky-200 text-sky-800`;
  }
  if (t.includes("traffic") || t.includes("source")) {
    return `${base} border-emerald-200 text-emerald-800`;
  }
  if (t.includes("booking") || t.includes("revenue") || t.includes("conversion")) {
    return `${base} border-amber-200 text-amber-900`;
  }
  if (
    t.includes("problem") ||
    t.includes("issue") ||
    t.includes("risk") ||
    t.includes("bounce")
  ) {
    return `${base} border-red-200 text-red-800`;
  }
  if (
    t.includes("action") ||
    t.includes("tomorrow") ||
    t.includes("next") ||
    t.includes("recommend")
  ) {
    return `${base} border-violet-200 text-violet-800`;
  }
  if (t.includes("page") || t.includes("exit") || t.includes("landing")) {
    return `${base} border-cyan-200 text-cyan-800`;
  }
  if (level === 1) return `${base} text-ocean-900`;
  if (level === 2) return `${base} border-ocean-100 text-ocean-800`;
  return `${base} text-teal-800`;
}

function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      parts.push(text.slice(last, m.index));
    }
    const token = m[0];
    if (token.startsWith("**")) {
      parts.push(
        <strong key={key++} className="font-semibold text-ocean-950">
          {token.slice(2, -2)}
        </strong>,
      );
    } else {
      parts.push(
        <code
          key={key++}
          className="rounded bg-sand px-1 py-0.5 font-mono text-[11px] text-cyan-900"
        >
          {token.slice(1, -1)}
        </code>,
      );
    }
    last = m.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

type Block =
  | { type: "h"; level: 1 | 2 | 3; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "p"; text: string };

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    const h = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    if (h) {
      blocks.push({
        type: "h",
        level: Math.min(3, h[1].length) as 1 | 2 | 3,
        text: h[2].trim(),
      });
      i += 1;
      continue;
    }

    if (/^[-*•]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length) {
        const t = (lines[i] ?? "").trim();
        const li = /^[-*•]\s+(.+)$/.exec(t);
        if (!li) break;
        items.push(li[1]);
        i += 1;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    if (/^\d+[.)]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length) {
        const t = (lines[i] ?? "").trim();
        const li = /^(\d+)[.)]\s+(.+)$/.exec(t);
        if (!li) break;
        items.push(li[2]);
        i += 1;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    const paras: string[] = [trimmed];
    i += 1;
    while (i < lines.length) {
      const t = (lines[i] ?? "").trim();
      if (
        !t ||
        /^#{1,3}\s+/.test(t) ||
        /^[-*•]\s+/.test(t) ||
        /^\d+[.)]\s+/.test(t)
      ) {
        break;
      }
      paras.push(t);
      i += 1;
    }
    blocks.push({ type: "p", text: paras.join(" ") });
  }

  return blocks;
}

function listAccent(prevHeading: string): string {
  const t = prevHeading.toLowerCase();
  if (t.includes("problem") || t.includes("issue")) return "marker:text-red-600";
  if (t.includes("action") || t.includes("tomorrow")) return "marker:text-violet-600";
  if (t.includes("traffic")) return "marker:text-emerald-600";
  if (t.includes("booking")) return "marker:text-amber-600";
  return "marker:text-ocean-500";
}

export function AiReportMarkdown({ markdown }: { markdown: string }) {
  const blocks = parseBlocks(markdown);
  let lastHeading = "";

  return (
    <div className="text-sm leading-relaxed text-ocean-800">
      {blocks.map((b, idx) => {
        if (b.type === "h") {
          lastHeading = b.text;
          const Tag = b.level === 1 ? "h3" : b.level === 2 ? "h4" : "h5";
          return (
            <Tag key={idx} className={headingClass(b.text, b.level)}>
              {b.text}
            </Tag>
          );
        }
        if (b.type === "ul") {
          return (
            <ul
              key={idx}
              className={`mt-2 list-disc space-y-1.5 pl-5 ${listAccent(lastHeading)}`}
            >
              {b.items.map((item, j) => (
                <li key={j} className="text-ocean-800">
                  {renderInline(item)}
                </li>
              ))}
            </ul>
          );
        }
        if (b.type === "ol") {
          return (
            <ol
              key={idx}
              className={`mt-2 list-decimal space-y-2 pl-5 ${listAccent(lastHeading)}`}
            >
              {b.items.map((item, j) => (
                <li key={j} className="text-ocean-800">
                  {renderInline(item)}
                </li>
              ))}
            </ol>
          );
        }
        return (
          <p key={idx} className="mt-2 text-ocean-700">
            {renderInline(b.text)}
          </p>
        );
      })}
    </div>
  );
}
