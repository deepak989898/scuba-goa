import type { ReactNode } from "react";
import { AdminContentSeoNav } from "@/components/admin/AdminContentSeoNav";
import { SeoIntelSubnav } from "./SeoIntelSubnav";

export default function SeoIntelligenceLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="admin-dense mx-auto max-w-7xl px-3 py-4 sm:px-4">
      <AdminContentSeoNav />
      <header className="mb-2">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-cyan-700">
          SEO tools
        </p>
        <h1 className="font-display text-xl font-extrabold text-ocean-900 sm:text-2xl">
          SEO Intelligence
        </h1>
        <p className="mt-0.5 max-w-3xl text-sm text-ocean-700">
          Competitor SEO research, keyword gaps and improvement suggestions.
          Ranking impact is not guaranteed.
        </p>
      </header>
      <SeoIntelSubnav />
      {children}
    </div>
  );
}
