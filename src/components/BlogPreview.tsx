import Link from "next/link";
import { blogPosts, SEO_PILLAR_SLUGS } from "@/data/blog-posts";

export function BlogPreview() {
  const posts = SEO_PILLAR_SLUGS.map((slug) => blogPosts.find((p) => p.slug === slug)).filter(
    (p): p is NonNullable<typeof p> => p != null
  );
  return (
    <section className="bg-white pb-6 pt-10 sm:pb-8 sm:pt-12" id="blog">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-ocean-900 sm:text-3xl lg:text-4xl">
              Scuba diving in Goa — essential guides
            </h2>
          </div>
          <Link
            href="/blog"
            className="text-xs font-semibold text-ocean-600 hover:text-ocean-800 sm:text-sm"
          >
            All articles →
          </Link>
        </div>
        <ul className="mt-6 grid gap-6 sm:mt-8 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/blog/${p.slug}`}
                className="u-depth-card block rounded-2xl border border-ocean-100 bg-sand p-4 hover:border-ocean-300 sm:p-5"
              >
                <p className="text-[10px] text-ocean-500 sm:text-xs">
                  {p.date} · {p.readTime}
                </p>
                <h3 className="mt-1.5 font-display text-base font-semibold leading-snug text-ocean-900 sm:mt-2 sm:text-lg">
                  {p.title}
                </h3>
                <p className="mt-1.5 line-clamp-3 text-xs text-ocean-700 sm:mt-2 sm:text-sm">
                  {p.excerpt}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
