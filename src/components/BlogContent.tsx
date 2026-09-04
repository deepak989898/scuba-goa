import Link from "next/link";
import type { ReactNode } from "react";
import { slugifyHeading } from "@/lib/blog-seo/headings";
import { normalizeRankingMarkdown } from "@/lib/blog-markdown-normalize";

function parseInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < text.length) {
    const bold = text.indexOf("**", i);
    const linkOpen = text.indexOf("[", i);
    const next = (() => {
      const candidates = [bold, linkOpen].filter((n) => n >= 0);
      return candidates.length ? Math.min(...candidates) : -1;
    })();
    if (next < 0) {
      nodes.push(text.slice(i));
      break;
    }
    if (next > i) nodes.push(text.slice(i, next));
    if (next === bold) {
      const end = text.indexOf("**", bold + 2);
      if (end < 0) {
        nodes.push(text.slice(bold));
        break;
      }
      nodes.push(
        <strong key={key++} className="font-semibold text-ocean-900">
          {text.slice(bold + 2, end)}
        </strong>,
      );
      i = end + 2;
      continue;
    }
    const closeLabel = text.indexOf("]", linkOpen);
    if (closeLabel < 0) {
      nodes.push(text[linkOpen]);
      i = linkOpen + 1;
      continue;
    }
    if (text[closeLabel + 1] !== "(") {
      nodes.push(text.slice(linkOpen, closeLabel + 1));
      i = closeLabel + 1;
      continue;
    }
    const closeHref = text.indexOf(")", closeLabel + 2);
    if (closeHref < 0) {
      nodes.push(text.slice(linkOpen));
      break;
    }
    const label = text.slice(linkOpen + 1, closeLabel);
    const href = text.slice(closeLabel + 2, closeHref);
    const isInternal = href.startsWith("/");
    nodes.push(
      isInternal ? (
        <Link
          key={key++}
          href={href}
          className="font-semibold text-ocean-700 underline decoration-ocean-300 underline-offset-2 hover:text-ocean-800"
        >
          {parseInline(label)}
        </Link>
      ) : (
        <a
          key={key++}
          href={href}
          className="font-semibold text-ocean-700 underline decoration-ocean-300 underline-offset-2 hover:text-ocean-800"
          rel="noopener noreferrer"
          target="_blank"
        >
          {parseInline(label)}
        </a>
      ),
    );
    i = closeHref + 1;
  }
  return nodes;
}

function Paragraph({ children }: { children: string }) {
  return <p className="mt-2 leading-snug sm:leading-relaxed">{parseInline(children)}</p>;
}

function uniqueHeadingId(text: string, seen: Map<string, number>): string {
  let id = slugifyHeading(text);
  const count = (seen.get(id) ?? 0) + 1;
  seen.set(id, count);
  if (count > 1) id = `${id}-${count}`;
  return id;
}

function parseTableBlock(raw: string): string[][] | null {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return null;
  if (!lines.every((l) => l.includes("|"))) return null;
  const rows = lines
    .filter((l) => !/^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$/.test(l))
    .map((l) =>
      l
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((c) => c.trim()),
    );
  return rows.length >= 2 ? rows : null;
}

function listItemText(line: string): string | null {
  const m = line.trim().match(/^(?:-|\*|•|\d+\.)\s+(.*)$/);
  return m ? m[1] : null;
}

function isBulletBlock(lines: string[]): boolean {
  const nonEmpty = lines.filter(Boolean);
  if (!nonEmpty.length) return false;
  return nonEmpty.every((l) => listItemText(l) !== null);
}

export function BlogContent({ content }: { content: string }) {
  const normalized = normalizeRankingMarkdown(content);
  const blocks = normalized.split(/\n\n+/);
  const out: React.ReactNode[] = [];
  const seenIds = new Map<string, number>();
  let i = 0;
  while (i < blocks.length) {
    const raw = blocks[i].trim();
    if (!raw) {
      i += 1;
      continue;
    }
    if (raw.startsWith("## ")) {
      const text = raw.replace(/^##\s+/, "");
      const id = uniqueHeadingId(text, seenIds);
      out.push(
        <h2
          key={i}
          id={id}
          className="mt-4 scroll-mt-20 border-l-4 border-teal-500 bg-gradient-to-r from-cyan-600 via-teal-600 to-ocean-700 bg-clip-text py-0.5 pl-2.5 text-lg font-extrabold text-transparent first:mt-0 sm:text-xl"
        >
          {parseInline(text)}
        </h2>,
      );
      i += 1;
      continue;
    }
    if (raw.startsWith("### ")) {
      const text = raw.replace(/^###\s+/, "");
      const id = uniqueHeadingId(text, seenIds);
      out.push(
        <h3
          key={i}
          id={id}
          className="mt-3 scroll-mt-20 bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-base font-extrabold text-transparent sm:text-lg"
        >
          {parseInline(text)}
        </h3>,
      );
      i += 1;
      continue;
    }

    const table = parseTableBlock(raw);
    if (table) {
      const [header, ...body] = table;
      out.push(
        <div key={i} className="mt-3 overflow-x-auto rounded-lg border border-ocean-100">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-ocean-50 text-ocean-900">
              <tr>
                {header.map((cell, j) => (
                  <th key={j} className="whitespace-nowrap px-2.5 py-1.5 font-semibold">
                    {parseInline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, ri) => (
                <tr key={ri} className="border-t border-ocean-100">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-2.5 py-1.5 align-top text-ocean-800">
                      {parseInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      i += 1;
      continue;
    }

    const lines = raw.split("\n").map((l) => l.trim());
    if (isBulletBlock(lines)) {
      out.push(
        <ul key={i} className="mt-2 list-disc space-y-1 pl-5 text-ocean-800">
          {lines
            .filter(Boolean)
            .map((l, j) => (
              <li key={j} className="leading-snug">
                {parseInline(listItemText(l) ?? l)}
              </li>
            ))}
        </ul>,
      );
      i += 1;
      continue;
    }
    const isDashList =
      lines.every((l) => !l || l.startsWith("- ")) &&
      lines.some((l) => l.startsWith("- "));
    if (isDashList) {
      out.push(
        <ul key={i} className="mt-2 list-disc space-y-1 pl-5 text-ocean-800">
          {lines
            .filter((l) => l.startsWith("- "))
            .map((l, j) => (
              <li key={j} className="leading-snug">
                {parseInline(l.replace(/^-\s+/, ""))}
              </li>
            ))}
        </ul>,
      );
      i += 1;
      continue;
    }
    out.push(<Paragraph key={i}>{raw.replace(/\n/g, " ")}</Paragraph>);
    i += 1;
  }
  return <>{out}</>;
}
