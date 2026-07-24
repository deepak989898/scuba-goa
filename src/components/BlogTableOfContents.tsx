"use client";

import { useEffect, useMemo, useState } from "react";
import type { BlogTocItem } from "@/lib/blog-seo/headings";

type Props = {
  items: BlogTocItem[];
};

/**
 * Accessible table of contents for long blog articles.
 * Desktop: sticky sidebar-friendly list. Mobile: collapsible details.
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

  const list = (
    <ol className="mt-2 space-y-1.5 text-sm">
      {items.map((item) => (
        <li
          key={item.id}
          className={item.level === 3 ? "ml-3 border-l border-ocean-100 pl-2" : ""}
        >
          <a
            href={`#${item.id}`}
            className={`block rounded px-1 py-0.5 transition hover:bg-ocean-50 hover:text-ocean-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
              activeId === item.id
                ? "font-semibold text-cyan-800"
                : "text-ocean-700"
            }`}
          >
            {item.text}
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <nav aria-label="Table of contents" className="mt-2.5">
      <details className="rounded-lg border border-ocean-100 bg-sand open:shadow-sm lg:hidden">
        <summary className="cursor-pointer list-none px-2.5 py-2 text-sm font-bold text-ocean-900 marker:hidden">
          On this page
          <span className="float-right text-ocean-500" aria-hidden>
            ⌄
          </span>
        </summary>
        <div className="border-t border-ocean-100 px-3 pb-3">{list}</div>
      </details>
      <div className="hidden lg:block">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-cyan-700">
          On this page
        </p>
        {list}
      </div>
    </nav>
  );
}
