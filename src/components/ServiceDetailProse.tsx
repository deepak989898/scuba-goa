import type { ReactNode } from "react";

/** Heading lines that should stand out in green on service/sub-service pages */
function isInclusionHeading(line: string): boolean {
  // Plain "Inclusion" / "Inclusions:" or with a leading emoji/bullet
  return /^(?:[^\w\s]+\s*)?inclusions?\s*:?\s*$/i.test(line.trim());
}

function isWhatsIncludedHeading(line: string): boolean {
  return /^(?:[^\w\s]+\s*)?what'?s\s+included\s*:?\s*$/i.test(line.trim());
}

function highlightDetailLine(line: string, key: string | number): ReactNode {
  const trimmed = line.trim();
  if (isInclusionHeading(trimmed) || isWhatsIncludedHeading(trimmed)) {
    return (
      <span
        key={key}
        className="block bg-gradient-to-r from-cyan-500 via-ocean-600 to-emerald-500 bg-clip-text font-display text-base font-extrabold tracking-wide text-transparent sm:text-lg"
      >
        {trimmed}
      </span>
    );
  }
  return (
    <span key={key} className="block">
      {line.length ? line : "\u00A0"}
    </span>
  );
}

type Props = {
  text: string;
  className?: string;
};

/**
 * Renders service detail / sub description body with "Inclusion" headings in green.
 */
export function ServiceDetailProse({ text, className }: Props) {
  const body = text.trim();
  if (!body) return null;

  const paras = body
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className={className ?? "space-y-2.5"}>
      {paras.map((p, i) => (
        <p
          key={i}
          className="text-sm leading-relaxed text-ocean-800 sm:text-[15px]"
        >
          {p.split("\n").map((line, j) => highlightDetailLine(line, `${i}-${j}`))}
        </p>
      ))}
    </div>
  );
}
