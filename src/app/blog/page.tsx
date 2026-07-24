import Link from "next/link";
import { getBlogPosts } from "@/lib/directus";
import { PageHero } from "@/components/sections/PageHero";
import { BreadcrumbJsonLd, ItemListJsonLd } from "@/components/seo/JsonLd";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Blog | Coach Hire Tips & News",
  description:
    "News, guides and tips from NP Coaches — choosing the right coach, ULEZ compliance, UK tours and more from our West London coach team.",
  path: "/blog",
  titleAbsolute: true,
});

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default async function BlogPage() {
  const posts = await getBlogPosts();

  return (
    <>
      <BreadcrumbJsonLd items={[{ label: "Home", path: "/" }, { label: "Blog", path: "/blog" }]} />
      <ItemListJsonLd name="NP Coaches blog" items={posts.map((p) => ({ name: p.title, path: `/blog/${p.slug}` }))} />

      <PageHero
        eyebrow="News & guides"
        title="Blog"
        intro="Guides, tips and news from the NP Coaches team."
        crumbs={[{ label: "Home", href: "/" }, { label: "Blog" }]}
      />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group flex flex-col rounded-xl border border-greyblue/30 bg-white p-6 transition-shadow hover:shadow-lg"
            >
              <time className="text-xs font-semibold uppercase tracking-wide text-accent" dateTime={post.date}>
                {formatDate(post.date)}
              </time>
              <h2 className="mt-2 font-display text-lg font-semibold text-navy">{post.title}</h2>
              <p className="mt-2 grow text-sm text-navy/70">{post.excerpt}</p>
              <span className="mt-4 inline-block text-sm font-semibold text-accent group-hover:underline">
                Read more →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
