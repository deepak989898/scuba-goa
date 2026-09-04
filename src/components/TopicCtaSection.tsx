import Link from "next/link";
import { whatsappLink } from "@/lib/constants";
import { getTopicCta, type ContentMeta } from "@/lib/content-clusters";

type Props = {
  content: ContentMeta;
  focusServiceSlug?: string;
  showTertiary?: boolean;
};

export function TopicCtaSection({
  content,
  focusServiceSlug,
  showTertiary = true,
}: Props) {
  const cta = getTopicCta(content, focusServiceSlug);

  return (
    <section
      className="mt-5 rounded-lg border border-cyan-100 bg-ocean-50/50 p-3 sm:p-4"
      aria-labelledby="topic-cta-heading"
    >
      <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-cyan-700">
        {cta.eyebrow}
      </p>
      <h2
        id="topic-cta-heading"
        className="mt-0.5 font-display text-lg font-bold text-ocean-900 sm:text-xl"
      >
        {cta.title}
      </h2>
      <p className="mt-1.5 max-w-2xl text-sm leading-snug text-ocean-700">
        {cta.description}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={cta.primaryHref}
          className="inline-flex min-h-10 items-center justify-center rounded-full bg-ocean-gradient px-4 py-2 text-sm font-bold text-white shadow-sm hover:opacity-95"
        >
          {cta.primaryLabel}
        </Link>
        <a
          href={whatsappLink(cta.whatsappMessage)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-10 items-center justify-center rounded-full border border-emerald-600 bg-white px-4 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-50"
        >
          {cta.secondaryLabel}
        </a>
        {showTertiary ? (
          <Link
            href="/services"
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-ocean-200 bg-white px-4 py-2 text-sm font-bold text-ocean-800 hover:bg-ocean-50"
          >
            All activities
          </Link>
        ) : null}
      </div>
    </section>
  );
}
