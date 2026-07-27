import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/motion";
import { StripesBackdrop, FloatingBlobs } from "@/components/ui/Backdrops";
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

      <section className="relative overflow-hidden bg-gradient-to-br from-navy via-navy to-brand-deep text-offwhite">
        <StripesBackdrop dark />
        <FloatingBlobs dark />
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-20">
          <Reveal>
            <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-greyblue">
              <Link href="/" className="transition-colors hover:text-offwhite">Home</Link>
              <span className="text-greyblue/50">/</span>
              <Link href="/blog" className="transition-colors hover:text-offwhite">Blog</Link>
            </nav>
            <Eyebrow className="text-sky-400">
              <time dateTime={post.date}>{formatDate(post.date)}</time> · {post.author}
            </Eyebrow>
            <h1 className="mt-3 font-display text-3xl font-bold leading-[1.12] sm:text-4xl">{post.title}</h1>
            {post.excerpt && <p className="mt-4 max-w-2xl text-lg text-greyblue">{post.excerpt}</p>}
          </Reveal>
        </div>
      </section>

      <section className="bg-offwhite">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:py-20">
          {thumbnail && (
            <Reveal>
              <div className="relative mb-8 aspect-[16/8] overflow-hidden rounded-3xl bg-greyblue/15 shadow-lg shadow-navy/10">
                <Image src={thumbnail} alt={post.title} fill sizes="(max-width: 1024px) 100vw, 960px" className="object-cover" priority />
              </div>
            </Reveal>
          )}
          <Reveal>
            <div className="mx-auto max-w-3xl rounded-3xl border border-greyblue/15 bg-white px-6 py-8 shadow-sm sm:px-10 sm:py-12">
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
      </section>
    </article>
  );
}
