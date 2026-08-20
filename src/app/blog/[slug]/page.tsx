import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { PageHero } from "@/components/sections/PageHero";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/motion";
import { assetUrl, getBlogPost, getBlogPosts, getSettings } from "@/lib/directus";

export async function generateStaticParams() {
  const posts = await getBlogPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return {};
  const image = assetUrl(post.thumbnail);
  return {
    title: { absolute: post.seoTitle },
    description: post.seoDescription,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: image ? { images: [{ url: image, alt: post.title }] } : undefined,
  };
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();

  const settings = await getSettings();
  const thumbnail = assetUrl(post.thumbnail);
  const articleDate = formatDate(post.date);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    author: { "@type": "Organization", name: post.author },
    publisher: { "@type": "Organization", name: settings.name },
    mainEntityOfPage: `${settings.url}/blog/${post.slug}`,
    image: thumbnail ?? undefined,
  };

  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <BreadcrumbJsonLd
        items={[{ label: "Home", path: "/" }, { label: "Blog", path: "/blog" }, { label: post.title, path: `/blog/${slug}` }]}
      />

      <PageHero
        eyebrow={`${articleDate} · ${post.author}`}
        title={post.title}
        intro={post.excerpt}
        crumbs={[{ label: "Home", href: "/" }, { label: "Blog", href: "/blog" }, { label: post.title }]}
        image={post.thumbnail}
        imageAlt={post.title}
        priority
      />

      <section className="bg-gradient-to-b from-offwhite via-tint-soft/70 to-offwhite">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-12 lg:py-20">
          <div>

            <Reveal>
              <div className="relative overflow-hidden rounded-3xl border border-greyblue/15 bg-white px-6 py-8 shadow-sm sm:px-10 sm:py-12">
                <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-400 via-accent to-sky-300" />
                <div className="prose" dangerouslySetInnerHTML={{ __html: post.body }} />
                <Link
                  href="/blog"
                  className="group mt-12 inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline"
                >
                  <Icon name="arrowLeft" className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                  All posts
                </Link>
              </div>
            </Reveal>
          </div>

          <aside className="lg:pt-2">
            <Reveal>
              <div className="rounded-3xl border border-accent/10 bg-white p-6 shadow-sm lg:sticky lg:top-28">
                <time dateTime={post.date} className="block text-sm font-semibold text-navy">{articleDate}</time>
                <p className="mt-1 text-sm text-navy/60">{post.author}</p>
                <div className="my-6 border-t border-greyblue/20" />
                <p className="font-display text-xl font-bold text-navy">{settings.name}</p>
                <p className="mt-2 text-sm leading-6 text-navy/65">{settings.tagline}</p>
                <Link
                  href={settings.homepage.heroPrimaryCta.href}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline"
                >
                  {settings.homepage.heroPrimaryCta.label}
                  <Icon name="arrowRight" className="h-4 w-4" />
                </Link>
              </div>
            </Reveal>
          </aside>
        </div>
      </section>
    </article>
  );
}
