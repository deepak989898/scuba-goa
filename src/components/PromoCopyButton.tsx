"use client";

import { useCallback, useState } from "react";

export function PromoCopyButton({ code }: { code: string }) {
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

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="rounded-lg border border-ocean-200 bg-white px-3 py-1.5 text-xs font-bold text-ocean-800 shadow-sm transition hover:bg-ocean-50"
    >
      {done ? "Copied" : "Copy code"}
    </button>
  );
}
