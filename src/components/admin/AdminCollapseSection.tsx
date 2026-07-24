"use client";

import { useState, type ReactNode } from "react";

type Props = {
  title: string;
  /** One-line summary shown when collapsed */
  hint?: string;
  badge?: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
};

/** Collapsible admin card — collapsed by default; click header to expand. */
export function AdminCollapseSection({
  title,
  hint,
  badge,
  defaultOpen = false,
  className = "",
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <details
      className={`group mt-3 overflow-hidden rounded-xl border border-ocean-100 bg-white shadow-sm open:border-cyan-300 open:ring-1 open:ring-cyan-100 ${className}`}
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 marker:hidden transition hover:bg-ocean-50/80">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-ocean-900">{title}</p>
            {badge}
          </div>
          {hint ? (
            <p className="mt-0.5 line-clamp-2 text-xs text-ocean-600">{hint}</p>
          ) : (
            <p className="mt-0.5 text-xs text-ocean-500">Click to expand</p>
          )}
        </div>
        <span
          aria-hidden
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sand text-base font-bold text-ocean-800 shadow-sm transition group-open:rotate-180 group-open:bg-cyan-100"
        >
          ⌄
        </span>
      </summary>
      <div className="border-t border-ocean-100 px-3 py-3">{children}</div>
    </details>
  );
}
