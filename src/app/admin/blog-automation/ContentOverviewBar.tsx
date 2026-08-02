"use client";

import Link from "next/link";
import type { ContentOverview } from "@/lib/admin-content-overview";

type Props = {
  overview: ContentOverview | null;
  loading: boolean;
};

function Chip({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div
      className="min-w-[7.5rem] flex-1 rounded-xl border border-ocean-100 bg-white px-3 py-2 shadow-sm"
      title={hint}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-ocean-500">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-extrabold tabular-nums text-ocean-900">
        {value}
      </p>
    </div>
  );
}

function gscLine(
  overview: ContentOverview,
  key: string,
  label: string,
): string {
  const b = overview.gscByType[key];
  if (!b || b.total === 0) return `${label}: —`;
  return `${label}: ${b.indexed} indexed · ${b.notIndexed} not · ${b.pending} pending (${b.total})`;
}

export function ContentOverviewBar({ overview, loading }: Props) {
  if (loading && !overview) {
    return (
      <div className="rounded-xl border border-ocean-100 bg-ocean-50/40 px-3 py-3 text-sm text-ocean-600">
        Loading page counts &amp; GSC index summary…
      </div>
    );
  }
  if (!overview) return null;

  const c = overview.counts;
  const g = overview.gscTotals;

  return (
    <section className="space-y-2.5 rounded-xl border border-ocean-100 bg-gradient-to-r from-ocean-50/80 to-cyan-50/40 p-3 shadow-sm sm:p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-sm font-bold text-ocean-900 sm:text-base">
            Site page inventory
          </h2>
          <p className="text-xs text-ocean-600">
            Counts from live site data · GSC from last agent sync
          </p>
        </div>
        <Link
          href="/admin/gsc-agent"
          className="rounded-full bg-ocean-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-ocean-900"
        >
          Open GSC Indexing Agent
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip
          label="Core static"
          value={c.coreStaticPages}
          hint="Fixed website pages (home, about, contact…)"
        />
        <Chip
          label="Extra / legal"
          value={c.extraLegalPages}
          hint="Privacy, terms, refund"
        />
        <Chip
          label="Service pages"
          value={c.servicePages}
          hint="Service + sub-service URLs"
        />
        <Chip label="Packages" value={c.packagePages} />
        <Chip
          label="Code blogs (left)"
          value={c.staticCodeBlogs}
          hint={`Repo has ${c.codeBlogsInRepo} code blogs; ${c.codeBlogsOverridden} already overridden in Firestore. This number = still from code only.`}
        />
        <Chip
          label="Firestore blogs"
          value={c.publishedBlogs}
          hint="Published Firestore blog posts (includes imported code blogs)"
        />
        <Chip label="Guides" value={c.guidePages} />
      </div>

      <details className="rounded-lg border border-ocean-100 bg-white/90 px-3 py-2 text-xs text-ocean-800">
        <summary className="cursor-pointer font-bold text-ocean-900">
          Core static pages kya hain? ({c.coreStaticPages}) — list dekho
        </summary>
        <p className="mt-1.5 text-ocean-600">
          Ye fixed marketing pages hain (blog/service detail nahi). Website ka
          structure:
        </p>
        <ul className="mt-1.5 grid gap-1 sm:grid-cols-2">
          {(overview.coreStaticPages ?? []).map((p) => (
            <li key={p.path} className="font-mono text-[11px]">
              <span className="font-semibold text-cyan-800">{p.path}</span>
              <span className="text-ocean-600"> — {p.label}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 font-bold text-ocean-900">Extra / legal:</p>
        <ul className="mt-1 grid gap-1 sm:grid-cols-2">
          {(overview.extraLegalPages ?? []).map((p) => (
            <li key={p.path} className="font-mono text-[11px]">
              <span className="font-semibold text-cyan-800">{p.path}</span>
              <span className="text-ocean-600"> — {p.label}</span>
            </li>
          ))}
        </ul>
      </details>

      <details className="rounded-lg border border-teal-100 bg-teal-50/40 px-3 py-2 text-xs text-ocean-800">
        <summary className="cursor-pointer font-bold text-teal-950">
          Code blogs vs Firestore — samjho ({c.codeBlogsOverridden}/
          {c.codeBlogsInRepo} override ho chuke)
        </summary>
        <p className="mt-1.5 text-ocean-700">
          Repo me <strong>{c.codeBlogsInRepo}</strong> code blogs hain. Agar
          same slug Firestore me hai to site <strong>Firestore</strong> se
          chalati hai (code override). Chip pe sirf woh count aata hai jo{" "}
          <strong>abhi bhi code se</strong> aate hain.
        </p>
        <p className="mt-1 text-ocean-700">
          Override ho chuke: <strong>{c.codeBlogsOverridden}</strong> · Abhi
          code se bachi: <strong>{c.staticCodeBlogs}</strong>
        </p>
        {c.staticCodeBlogs > 0 ? (
          <>
            <p className="mt-2 font-bold text-orange-900">
              Abhi bhi code se (Firestore me nahi) — import karo:
            </p>
            <ul className="mt-1 max-h-36 space-y-1 overflow-y-auto">
              {(overview.codeBlogsStillFromCode ?? []).map((b) => (
                <li key={b.slug} className="font-mono text-[11px]">
                  <span className="text-cyan-800">/blog/{b.slug}</span>
                  <span className="text-ocean-600"> — {b.title}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-2 font-semibold text-emerald-800">
            Sab code blogs Firestore me override ho chuke — chip 0 sahi hai.
          </p>
        )}
      </details>

      <div className="rounded-lg border border-ocean-100 bg-white/80 px-3 py-2 text-xs text-ocean-800">
        <p className="font-bold text-ocean-900">
          GSC tracking: {g.total} URLs ·{" "}
          <span className="text-emerald-700">{g.indexed} indexed</span> ·{" "}
          <span className="text-orange-700">{g.notIndexed} not indexed</span> ·{" "}
          <span className="text-slate-600">{g.pending} pending/unknown</span>
        </p>
        <p className="mt-1 text-ocean-600">
          {gscLine(overview, "blog", "Blogs")} ·{" "}
          {gscLine(overview, "service", "Services")} ·{" "}
          {gscLine(overview, "static", "Static")} ·{" "}
          {gscLine(overview, "guide", "Guides")}
        </p>
        <p className="mt-1 text-[11px] text-ocean-500">{overview.disclaimer}</p>
      </div>

      {overview.notIndexedSample.length > 0 ? (
        <div className="rounded-lg border border-orange-200 bg-orange-50/50 px-3 py-2">
          <p className="text-xs font-bold text-orange-950">
            Focus first — not indexed / awaiting inspection (
            {overview.notIndexedSample.length} shown)
          </p>
          <ul className="mt-1.5 max-h-48 space-y-1.5 overflow-y-auto text-xs">
            {overview.notIndexedSample.map((row) => (
              <li
                key={row.url}
                className="rounded-md border border-orange-100 bg-white/70 px-2 py-1.5"
              >
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="rounded bg-orange-100 px-1 py-0.5 text-[10px] font-bold uppercase text-orange-900">
                    {row.pageType}
                  </span>
                  <span className="font-mono text-[11px] text-ocean-800">
                    {row.path}
                  </span>
                  <span className="font-semibold text-rose-700">
                    {row.indexStatus.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="mt-0.5 text-ocean-700">{row.why}</p>
                <p className="text-ocean-500">→ {row.improveHint}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-emerald-800">
          No not-indexed / pending pages in the recent GSC sample
          {!overview.gscConnected
            ? " — run inventory in GSC Indexing Agent if this looks empty."
            : "."}
        </p>
      )}
    </section>
  );
}
