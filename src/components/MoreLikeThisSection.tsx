import Link from "next/link";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import { SeoDescriptionWithPhone } from "@/components/SeoDescriptionWithPhone";
import type { ClusterContentItem } from "@/lib/content-clusters";
import {
  classifyContent,
  getMoreLikeThisHeading,
  getMoreLikeThisSubheading,
} from "@/lib/content-clusters";
import { buildMetaDescriptionWithContact } from "@/lib/seo-meta-description";
import { isFreeStockImageUrl, pickBlogFeaturedImage } from "@/lib/cms-image";
import { MORE_LIKE_THIS_LIMIT } from "@/lib/cluster-related-content";

type Props = {
  items: ClusterContentItem[];
  currentTitle: string;
  currentKeywords: string[];
};

export function MoreLikeThisSection({
  items,
  currentTitle,
  currentKeywords,
}: Props) {
  const visibleItems = items
    .filter((item) => item.editorialImage === true)
    .slice(0, MORE_LIKE_THIS_LIMIT);

  if (visibleItems.length === 0) return null;

  const topic = classifyContent({
    title: currentTitle,
    keywords: currentKeywords,
  });

  return (
    <section
      className="mt-5 border-t border-ocean-100 pt-4"
      aria-labelledby="more-like-this-heading"
    >
      <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-amber-700">
        More like this
      </p>
      <h2
        id="more-like-this-heading"
        className="mt-0.5 font-display text-lg font-bold text-ocean-900 sm:text-xl"
      >
        {getMoreLikeThisHeading(topic)}
      </h2>
      <p className="mt-1 text-sm text-ocean-700">
        {getMoreLikeThisSubheading(topic)}
      </p>
      <ul className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
        {visibleItems.map((item) => {
          const cardImage = pickBlogFeaturedImage(item.imageUrl);
          if (!cardImage || isFreeStockImageUrl(cardImage)) return null;

          const cta =
            item.kind === "guide" ? "Read guide" : "Read article";

          return (
            <li key={`${item.kind}-${item.slug}`} className="h-full">
              <Link
                href={item.href}
                className="group flex h-full flex-col overflow-hidden rounded-lg border border-ocean-100 bg-sand shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-ocean-100">
                  <CmsRemoteImage
                    src={cardImage}
                    alt={item.title}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
                    loading="lazy"
                  />
                  <span className="absolute left-2 top-2 rounded-full bg-ocean-900/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    {item.kind === "guide" ? "Guide" : "Blog"}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-2.5">
                  {item.updatedAt ? (
                    <p className="text-[10px] font-medium text-cyan-700">
                      Updated {item.updatedAt.slice(0, 10)}
                    </p>
                  ) : null}
                  <h3 className="mt-0.5 font-display text-sm font-bold leading-snug text-ocean-900 transition group-hover:text-cyan-700 sm:text-base">
                    {item.title}
                  </h3>
                  {item.description ? (
                    <p className="mt-1 line-clamp-2 text-xs leading-snug text-ocean-700 sm:text-sm">
                      <SeoDescriptionWithPhone
                        description={buildMetaDescriptionWithContact(
                          item.description,
                        )}
                      />
                    </p>
                  ) : null}
                  <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-amber-700 sm:text-sm">
                    {cta} <span aria-hidden>→</span>
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
