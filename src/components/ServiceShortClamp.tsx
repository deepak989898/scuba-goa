"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";

type Props = {
  slug: string;
  text: string;
  className?: string;
};

/** Max 2 lines; shows More… when clamped (links to service detail). */
export function ServiceShortClamp({ slug, text, className }: Props) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [overflow, setOverflow] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !text.trim()) {
      setOverflow(false);
      return;
    }
    setOverflow(el.scrollHeight > el.clientHeight + 2);
  }, [text]);

  if (!text.trim()) return null;

  return (
    <div className={className}>
      <p
        ref={ref}
        className="mt-1 line-clamp-3 text-xs text-ocean-700 sm:line-clamp-2 sm:text-sm"
        title={text}
      >
        {text}
      </p>
      {overflow ? (
        <Link
          href={`/services/${slug}`}
          className="mt-2 inline-flex min-h-11 touch-manipulation items-center justify-center rounded-full border border-ocean-200 bg-white px-4 py-3 text-sm font-bold text-blue-700 shadow-sm hover:border-ocean-300 hover:bg-ocean-50 hover:text-blue-800"
        >
          More…
        </Link>
      ) : null}
    </div>
  );
}
