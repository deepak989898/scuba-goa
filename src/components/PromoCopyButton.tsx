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
    try {
      await navigator.clipboard.writeText(code);
      setDone(true);
      window.setTimeout(() => setDone(false), 2000);
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = code;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setDone(true);
        window.setTimeout(() => setDone(false), 2000);
      } catch {
        /* ignore */
      }
    }
  }, [code]);

  const base =
    variant === "solid"
      ? "min-h-10 touch-manipulation rounded-lg bg-[#0b3d66] px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-[#0e4d7a] active:scale-[0.98]"
      : "min-h-11 touch-manipulation rounded-full border border-ocean-200 bg-white px-4 py-3 text-sm font-bold text-ocean-800 shadow-sm transition hover:bg-ocean-50";

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className={`${base} ${className}`.trim()}
    >
      {done ? "Copied!" : "Copy Code"}
    </button>
  );
}
