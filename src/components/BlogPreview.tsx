import Link from "next/link";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import { blogPosts, SEO_PILLAR_SLUGS } from "@/data/blog-posts";
import { getPublishedBlogPostBySlug } from "@/lib/blog-posts-server";

const u = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=70`;

/** Fallback card images when a pillar post has no featured image in Firestore. */
const PILLAR_FALLBACK_IMAGES: Record<string, { src: string; alt: string }> = {
  "best-time-for-scuba-diving-in-goa": {
    src: u("photo-1544551763-46a013bb70d5"),
    alt: "Scuba diving in clear Goa waters",
  },
  "is-scuba-diving-safe": {
    src: u("photo-1682687220063-4742bd7fd538"),
    alt: "Scuba diver with instructor underwater",
  },
  "scuba-diving-with-island-trip-goa": {
    src: u("photo-1559827260-dc66d52bef19"),
    alt: "Island boat trip for scuba diving in Goa",
  },
  "scuba-diving-price-guide-2026": {
    src: u("photo-1582967788606-a171f1080dd0"),
    alt: "Scuba diving gear and packages in Goa",
  },
};

export async function BlogPreview() {
  const posts = (
    await Promise.all(
      SEO_PILLAR_SLUGS.map(async (slug) => {
        const staticPost = blogPosts.find((p) => p.slug === slug);
        if (!staticPost) return null;
        const fs = await getPublishedBlogPostBySlug(slug);
        const imageUrl =
          fs?.featuredImageUrl?.trim() ||
          fs?.ogImageUrl?.trim() ||
          staticPost.imageUrl?.trim() ||
          PILLAR_FALLBACK_IMAGES[slug]?.src ||
          "";
        const imageAlt =
          fs?.featuredImageAlt?.trim() ||
          staticPost.imageAlt ||
          PILLAR_FALLBACK_IMAGES[slug]?.alt ||
          staticPost.title;
        return { ...staticPost, imageUrl, imageAlt };
      }),
    )
  ).filter((p): p is NonNullable<typeof p> => p != null);

  return (
    <section className="bg-white py-4 sm:py-5" id="blog">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-display text-xl font-bold text-ocean-900 sm:text-2xl">
            Scuba diving in Goa — essential guides
          </h2>
          <Link
            href="/blog"
            className="inline-flex min-h-10 touch-manipulation items-center justify-center rounded-full border border-ocean-200 bg-white px-4 py-2 text-sm font-bold text-blue-700 shadow-sm hover:border-ocean-300 hover:bg-ocean-50"
          >
            All articles →
          </Link>
        </div>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.slice(0, 3).map((p) => (
            <li key={p.slug} className="h-full">
              <Link
                href={`/blog/${p.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-xl border border-ocean-100 bg-sand shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md"
              >
                {p.imageUrl ? (
                  <div className="relative aspect-[16/9] overflow-hidden bg-ocean-100">
                    <CmsRemoteImage
                      src={p.imageUrl}
                      alt={p.imageAlt || p.title}
                      fill
                      className="object-cover transition duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      loading="lazy"
                    />
                  </div>
                ) : null}
                <div className="flex flex-1 flex-col p-3.5">
                  <p className="text-[10px] font-medium text-ocean-700 sm:text-xs">
                    {p.date} · {p.readTime}
                  </p>
                  <h3 className="mt-1 font-display text-base font-semibold leading-snug text-ocean-900 transition group-hover:text-cyan-800">
                    {p.title}
                  </h3>
                  <p className="mt-1.5 line-clamp-2 text-xs text-ocean-700 sm:text-sm">
                    {p.excerpt}
                  </p>
                  <span className="mt-2.5 text-sm font-bold text-amber-700">
                    Read article →
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
