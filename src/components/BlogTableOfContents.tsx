"use client";

import { useEffect, useMemo, useState } from "react";
import type { BlogTocItem } from "@/lib/blog-seo/headings";

type Props = {
  items: BlogTocItem[];
};

/**
 * Horizontal “On this page” jump buttons for blog articles.
 */
export function BlogTableOfContents({ items }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const ids = useMemo(() => items.map((i) => i.id), [items]);

  useEffect(() => {
    if (ids.length === 0) return;
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0, 0.25, 0.5, 1],
      },
    );
    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, [ids]);

  if (items.length < 3) return null;

  return (
    <nav aria-label="Table of contents" className="mt-2">
      <h2 className="bg-gradient-to-r from-cyan-500 via-ocean-600 to-emerald-500 bg-clip-text font-display text-base font-extrabold tracking-wide text-transparent sm:text-lg">
        On this page
      </h2>
      <ul className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => {
          const active = activeId === item.id;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                onClick={(e) => {
                  const el = document.getElementById(item.id);
                  if (!el) return;
                  e.preventDefault();
                  el.scrollIntoView({ behavior: "smooth", block: "start" });
                  window.history.replaceState(null, "", `#${item.id}`);
                  setActiveId(item.id);
                }}
                className={`inline-flex min-h-9 touch-manipulation items-center justify-center rounded-full border px-3.5 py-1.5 text-xs font-bold transition sm:min-h-10 sm:px-4 sm:text-sm ${
                  active
                    ? "border-teal-400 bg-gradient-to-r from-cyan-500 via-teal-500 to-ocean-600 text-white shadow-md shadow-teal-500/30 ring-2 ring-cyan-200/70"
                    : "border-ocean-200 bg-white text-ocean-800 shadow-sm hover:border-cyan-400 hover:bg-cyan-50 hover:text-cyan-900"
                }`}
              >
                {item.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
