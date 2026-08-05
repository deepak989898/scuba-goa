import Link from "next/link";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import { HOMEPAGE_PACKAGE_GUIDES } from "@/data/blog-posts";
import { getPublishedBlogPostBySlug } from "@/lib/blog-posts-server";
import { cmsImageOrPlaceholder, pickCmsImage } from "@/lib/cms-image";
import { getAllServicesServer } from "@/lib/get-services-server";
import { serviceDetailImages } from "@/lib/service-images";

/**
 * Homepage package guides: one article per package type, with that package’s
 * own photo (not the same scuba blog graphics on every card).
 * Content comes from published Firestore blogs.
 */
export async function BlogPreview() {
  const services = await getAllServicesServer();
  const bySlug = new Map(services.map((s) => [s.slug, s]));

  const posts = (
    await Promise.all(
      HOMEPAGE_PACKAGE_GUIDES.map(async (guide) => {
        const fs = await getPublishedBlogPostBySlug(guide.slug);
        if (!fs) return null;

        const service = bySlug.get(guide.serviceSlug);
        const serviceImage = service
          ? pickCmsImage(...serviceDetailImages(service))
          : "";

        const imageUrl = cmsImageOrPlaceholder(
          serviceImage,
          fs.featuredImageUrl,
          fs.ogImageUrl,
        );

        const imageAlt =
          (service ? `${service.title} package in Goa` : "") ||
          fs.featuredImageAlt?.trim() ||
          fs.title;

        const priceFrom =
          typeof service?.priceFrom === "number" && service.priceFrom > 0
            ? service.priceFrom
            : null;

        return {
          slug: fs.slug,
          title: fs.title,
          excerpt: fs.excerpt,
          readTime: fs.readTime,
          imageUrl,
          imageAlt,
          packageLabel: guide.packageLabel,
          serviceSlug: guide.serviceSlug,
          serviceTitle: service?.title ?? guide.packageLabel,
          priceFrom,
        };
      }),
    )
  ).filter((p): p is NonNullable<typeof p> => p != null);

  return (
    <section className="bg-white py-4 sm:py-5" id="blog">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-ocean-900 sm:text-2xl">
              Popular Goa packages — guides to book
            </h2>
            <p className="mt-1 text-sm text-ocean-600">
              Scuba, water sports, Dudhsagar & more — each card is a different package.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/services"
              className="inline-flex min-h-10 touch-manipulation items-center justify-center rounded-full bg-ocean-800 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-ocean-900"
            >
              All packages →
            </Link>
            <Link
              href="/blog"
              className="inline-flex min-h-10 touch-manipulation items-center justify-center rounded-full border border-ocean-200 bg-white px-4 py-2 text-sm font-bold text-blue-700 shadow-sm hover:border-ocean-300 hover:bg-ocean-50"
            >
              All articles →
            </Link>
          </div>
        </div>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <li key={p.slug} className="h-full">
              <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-ocean-100 bg-sand shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md">
                <Link href={`/blog/${p.slug}`} className="relative block aspect-[16/9] overflow-hidden bg-ocean-100">
                  {p.imageUrl ? (
                    <CmsRemoteImage
                      src={p.imageUrl}
                      alt={p.imageAlt || p.title}
                      fill
                      className="object-cover transition duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      loading="lazy"
                    />
                  ) : null}
                  <span className="absolute left-2 top-2 rounded-md bg-ocean-900/85 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    {p.packageLabel}
                  </span>
                </Link>
                <div className="flex flex-1 flex-col p-3.5">
                  <p className="text-[10px] font-medium text-ocean-700 sm:text-xs">
                    {p.serviceTitle}
                    {p.priceFrom != null
                      ? ` · from ₹${p.priceFrom.toLocaleString("en-IN")}`
                      : ""}
                    {" · "}
                    {p.readTime}
                  </p>
                  <Link href={`/blog/${p.slug}`}>
                    <h3 className="mt-1 font-display text-base font-semibold leading-snug text-ocean-900 transition group-hover:text-cyan-800">
                      {p.title}
                    </h3>
                  </Link>
                  <p className="mt-1.5 line-clamp-2 text-xs text-ocean-700 sm:text-sm">
                    {p.excerpt}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/services/${p.serviceSlug}`}
                      className="inline-flex min-h-9 flex-1 items-center justify-center rounded-full bg-cyan-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-cyan-700"
                    >
                      View package
                    </Link>
                    <Link
                      href={`/blog/${p.slug}`}
                      className="inline-flex min-h-9 items-center justify-center rounded-full border border-ocean-200 bg-white px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-50"
                    >
                      Read guide →
                    </Link>
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
