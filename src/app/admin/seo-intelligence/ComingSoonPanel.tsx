import Link from "next/link";

export function ComingSoonPanel({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-ocean-100 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="font-display text-lg font-bold text-ocean-900">{title}</h2>
      <p className="mt-1 text-sm text-ocean-700">{body}</p>
      <p className="mt-3 text-xs text-ocean-500">
        Foundation is live: Competitors + Settings work now. This section will
        connect next without changing public pages.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href="/admin/seo-intelligence/competitors"
          className="rounded-full bg-ocean-800 px-3 py-1.5 text-xs font-bold text-white"
        >
          Open Competitors
        </Link>
        <Link
          href="/admin/gsc-agent"
          className="rounded-full border border-ocean-200 bg-white px-3 py-1.5 text-xs font-bold text-ocean-800"
        >
          GSC Indexing Agent
        </Link>
      </div>
    </div>
  );
}
