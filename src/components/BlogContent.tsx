import Link from "next/link";
import type { ReactNode } from "react";

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
        </strong>
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
          className="font-semibold text-ocean-600 underline decoration-ocean-300 underline-offset-2 hover:text-ocean-800"
        >
          {parseInline(label)}
        </Link>
      ) : (
        <a
          key={key++}
          href={href}
          className="font-semibold text-ocean-600 underline decoration-ocean-300 underline-offset-2 hover:text-ocean-800"
          rel="noopener noreferrer"
          target="_blank"
        >
          {parseInline(label)}
        </a>
      )
    );
    i = closeHref + 1;
  }
  return nodes;
}

function Paragraph({ children }: { children: string }) {
  return (
    <p className="mt-4 leading-relaxed">{parseInline(children)}</p>
  );
}

export function BlogContent({ content }: { content: string }) {
  const blocks = content.split(/\n\n+/);
  const out: React.ReactNode[] = [];
  let i = 0;
  while (i < blocks.length) {
    const raw = blocks[i].trim();
    if (!raw) {
      i += 1;
      continue;
    }
    if (raw.startsWith("## ")) {
      out.push(
        <h2
          key={i}
          className="mt-10 scroll-mt-24 text-2xl font-bold text-ocean-900 first:mt-0"
        >
          {raw.replace(/^##\s+/, "")}
        </h2>
      );
      i += 1;
      continue;
    }
    if (raw.startsWith("### ")) {
      out.push(
        <h3 key={i} className="mt-8 text-xl font-semibold text-ocean-900">
          {raw.replace(/^###\s+/, "")}
        </h3>
      );
      i += 1;
      continue;
    }
    const lines = raw.split("\n").map((l) => l.trim());
    const isList = lines.every((l) => !l || l.startsWith("- "));
    if (isList && lines.some((l) => l.startsWith("- "))) {
      out.push(
        <ul key={i} className="mt-4 list-disc space-y-2 pl-6 text-ocean-800">
          {lines
            .filter((l) => l.startsWith("- "))
            .map((l, j) => (
              <li key={j} className="leading-relaxed">
                {parseInline(l.replace(/^-\s+/, ""))}
              </li>
            ))}
        </ul>
      );
      i += 1;
      continue;
    }
    out.push(<Paragraph key={i}>{raw.replace(/\n/g, " ")}</Paragraph>);
    i += 1;
  }
  return <>{out}</>;
}
