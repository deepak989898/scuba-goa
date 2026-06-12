import Link from "next/link";

type Segment =
  | { kind: "text"; value: string }
  | { kind: "link"; href: string; label: string };

function parseBareUrls(text: string): Segment[] {
  const segments: Segment[] = [];
  const re = /(https?:\/\/[^\s<>\[\]()]+)|(\/(?:booking|services|blog|guides|offers|contact|about)[^\s<>\[\]()]*)|(\bbookscubagoa\.com[^\s<>\[\]()]*)/gi;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      segments.push({ kind: "text", value: text.slice(last, m.index) });
    }
    let href = m[1] ?? m[2] ?? m[3] ?? "";
    if (href.startsWith("bookscubagoa.com")) href = `https://${href}`;
    const label = href.replace(/^https?:\/\/[^/]+/, "") || href;
    segments.push({ kind: "link", href, label: label.startsWith("/") ? label : href });
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    segments.push({ kind: "text", value: text.slice(last) });
  }
  if (!segments.length && text) {
    segments.push({ kind: "text", value: text });
  }
  return segments;
}

function parseChatMessage(text: string): Segment[] {
  const segments: Segment[] = [];
  let remaining = text;
  const mdRe = /\[([^\]]+)\]\(([^)]+)\)/;

  while (remaining.length) {
    const match = remaining.match(mdRe);
    if (!match || match.index === undefined) {
      segments.push(...parseBareUrls(remaining));
      break;
    }
    if (match.index > 0) {
      segments.push(...parseBareUrls(remaining.slice(0, match.index)));
    }
    const href = match[2].trim();
    segments.push({ kind: "link", href, label: match[1].trim() });
    remaining = remaining.slice(match.index + match[0].length);
  }

  return segments;
}

function isInternalHref(href: string): boolean {
  if (href.startsWith("/")) return true;
  try {
    const u = new URL(href);
    return u.hostname === "bookscubagoa.com" || u.hostname === "www.bookscubagoa.com";
  } catch {
    return false;
  }
}

function toInternalPath(href: string): string {
  if (href.startsWith("/")) return href;
  try {
    const u = new URL(href);
    return `${u.pathname}${u.search}${u.hash}`;
  } catch {
    return href;
  }
}

const linkClass =
  "font-semibold text-ocean-800 underline decoration-ocean-400 underline-offset-2 hover:text-ocean-950";

export function ChatMessageBody({ text }: { text: string }) {
  const segments = parseChatMessage(text);

  return (
    <span className="whitespace-pre-wrap break-words">
      {segments.map((seg, i) => {
        if (seg.kind === "text") {
          return <span key={i}>{seg.value}</span>;
        }
        if (isInternalHref(seg.href)) {
          return (
            <Link key={i} href={toInternalPath(seg.href)} className={linkClass}>
              {seg.label}
            </Link>
          );
        }
        return (
          <a
            key={i}
            href={seg.href}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            {seg.label}
          </a>
        );
      })}
    </span>
  );
}
