"use client";

import { useCallback, useState } from "react";

type Props = {
  code: string;
  /** solid = dark blue CTA (offers redesign); default = light pill */
  variant?: "default" | "solid";
  className?: string;
};

export function PromoCopyButton({
  code,
  variant = "default",
  className = "",
}: Props) {
  const [done, setDone] = useState(false);

  const copy = useCallback(async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(code);
      ok = true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = code;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {
        ok = false;
      }
    }
    if (!ok) return;
    setDone(true);
    window.setTimeout(() => setDone(false), 2500);
  }, [code]);

  const base =
    variant === "solid"
      ? done
        ? "min-h-8 touch-manipulation rounded-md bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-sm transition sm:text-xs"
        : "min-h-8 touch-manipulation rounded-md bg-[#0b3d66] px-2.5 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-[#0e4d7a] active:scale-[0.98] sm:text-xs"
      : done
        ? "min-h-11 touch-manipulation rounded-full border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 shadow-sm transition"
        : "min-h-11 touch-manipulation rounded-full border border-ocean-200 bg-white px-4 py-3 text-sm font-bold text-ocean-800 shadow-sm transition hover:bg-ocean-50";

  return (
    <button
      type="button"
      onClick={() => void copy()}
      aria-live="polite"
      className={`${base} ${className}`.trim()}
    >
      {done ? "Copied!" : "Copy Code"}
    </button>
  );
}
