"use client";

import { useState, type ReactNode } from "react";

type Props = {
  title: string;
  /** One-line summary shown when collapsed */
  hint?: string;
  badge?: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  /** Fires when the section is expanded or collapsed. */
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
};

function CollapseChevron({ open }: { open: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ocean-200 bg-ocean-50 text-ocean-800 shadow-sm transition duration-200 ${
        open
          ? "rotate-180 border-cyan-400 bg-cyan-100 text-cyan-900"
          : "hover:border-ocean-300 hover:bg-white"
      }`}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="block"
      >
        <path
          d="M3.5 6L8 10.5L12.5 6"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

/** Collapsible admin card — collapsed by default; click header to expand. */
export function AdminCollapseSection({
  title,
  hint,
  badge,
  defaultOpen = false,
  className = "",
  onOpenChange,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <details
      className={`mt-3 overflow-hidden rounded-xl border border-ocean-100 bg-white shadow-sm open:border-cyan-300 open:ring-1 open:ring-cyan-100 ${className}`}
      open={open}
      onToggle={(e) => {
        const next = e.currentTarget.open;
        setOpen(next);
        onOpenChange?.(next);
      }}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 marker:hidden transition hover:bg-ocean-50/80 [&::-webkit-details-marker]:hidden">
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
        <CollapseChevron open={open} />
      </summary>
      <div className="border-t border-ocean-100 px-3 py-3">{children}</div>
    </details>
  );
}
