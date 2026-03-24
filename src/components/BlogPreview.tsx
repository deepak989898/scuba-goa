import Link from "next/link";
import { blogPosts } from "@/data/blog-posts";

export function BlogPreview() {
  const posts = blogPosts.slice(0, 4);
  return (
    <section className="bg-white py-16 sm:py-20" id="blog">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-ocean-900 sm:text-3xl lg:text-4xl">
              Goa travel & diving guides
            </h2>
            <p className="mt-1.5 text-sm text-ocean-700 sm:mt-2 sm:text-base">
              SEO-ready articles: scuba diving Goa, water sports Goa booking, tour
              tips.
            </p>
          </div>
          <Link
            href="/blog"
            className="text-xs font-semibold text-ocean-600 hover:text-ocean-800 sm:text-sm"
          >
            All articles →
          </Link>
        </div>
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {posts.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/blog/${p.slug}`}
                className="block rounded-2xl border border-ocean-100 bg-sand p-4 transition hover:border-ocean-300 hover:shadow-sm sm:p-5"
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
