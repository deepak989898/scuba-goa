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
        className="mt-1 line-clamp-2 text-sm text-ocean-600"
        title={text}
      >
        {text}
      </p>
      {overflow ? (
        <Link
          href={`/services/${slug}`}
          className="mt-1 inline-block text-xs font-semibold text-ocean-600 hover:text-ocean-800 hover:underline"
        >
          More…
        </Link>
      ) : null}
    </div>
  );
}
