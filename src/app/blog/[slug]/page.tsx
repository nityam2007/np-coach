import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/motion";
import { StripesBackdrop, FloatingBlobs } from "@/components/ui/Backdrops";
import { getBlogPost, getBlogPosts, getSettings } from "@/lib/directus";

export async function generateStaticParams() {
  const posts = await getBlogPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return {};
  return { title: { absolute: post.seoTitle }, description: post.seoDescription , alternates: { canonical: `/blog/${slug}` } };
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();

  const settings = await getSettings();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    author: { "@type": "Organization", name: post.author },
    publisher: { "@type": "Organization", name: settings.name },
    mainEntityOfPage: `${settings.url}/blog/${post.slug}`,
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

      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-20">
        <Reveal>
          <div className="prose" dangerouslySetInnerHTML={{ __html: post.body }} />
          <Link
            href="/blog"
            className="group mt-12 inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline"
          >
            <Icon name="arrowLeft" className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            All posts
          </Link>
        </Reveal>
      </section>
    </article>
  );
}
