import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { blogPosts, getPostBySlug } from "@/data/blog-posts";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return blogPosts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = getPostBySlug(slug);
  if (!p) return { title: "Article" };
  return {
    title: p.title,
    description: p.excerpt,
    keywords: p.keywords,
    openGraph: { title: p.title, description: p.excerpt, type: "article" },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const p = getPostBySlug(slug);
  if (!p) notFound();

  return (
    <article className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Link href="/blog" className="text-sm font-semibold text-ocean-600">
          ← All articles
        </Link>
        <p className="mt-6 text-sm text-ocean-500">
          {p.date} · {p.readTime}
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold leading-tight text-ocean-900 sm:text-4xl">
          {p.title}
        </h1>
        <p className="mt-4 text-lg text-ocean-700">{p.excerpt}</p>
        <div className="prose prose-ocean mt-10 max-w-none text-ocean-800 prose-headings:font-display prose-a:text-ocean-600">
          {p.content.split("\n\n").map((block, i) => {
            if (block.startsWith("## ")) {
              return (
                <h2 key={i} className="mt-8 text-2xl font-bold text-ocean-900">
                  {block.replace(/^##\s/, "")}
                </h2>
              );
            }
            return (
              <p key={i} className="mt-4 leading-relaxed">
                {block}
              </p>
            );
          })}
        </div>
        <Link
          href="/booking"
          className="mt-12 inline-flex rounded-full bg-ocean-gradient px-6 py-3 text-sm font-semibold text-white"
        >
          Check live rates & book
        </Link>
      </div>
    </article>
  );
}
