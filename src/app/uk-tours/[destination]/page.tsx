import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/motion";
import { ButtonLink, buttonCls } from "@/components/ui/Button";
import { StripesBackdrop, FloatingBlobs } from "@/components/ui/Backdrops";
import { assetUrl, getTour, getTours, getSettings } from "@/lib/directus";

export async function generateStaticParams() {
  const tours = await getTours();
  return tours.map((tour) => ({ destination: tour.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ destination: string }>;
}): Promise<Metadata> {
  const { destination } = await params;
  const tour = await getTour(destination);
  if (!tour) return {};
  return { title: { absolute: tour.seoTitle }, description: tour.seoDescription , alternates: { canonical: `/uk-tours/${destination}` } };
}

export default async function TourPage({ params }: { params: Promise<{ destination: string }> }) {
  const { destination } = await params;
  const tour = await getTour(destination);
  if (!tour) notFound();

  const settings = await getSettings();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Coach hire and UK tours",
    name: `${tour.destination} coach tours from West London`,
    description: tour.seoDescription,
    areaServed: "United Kingdom",
    provider: { "@type": "Organization", name: settings.name, telephone: settings.phone.display },
    offers: { "@type": "Offer", priceCurrency: "GBP", url: `${settings.url}/get-a-quote` },
  };

  const heroImg = assetUrl(tour.image);
  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <BreadcrumbJsonLd
        items={[
          { label: "Home", path: "/" },
          { label: "UK Tours", path: "/uk-tours" },
          { label: tour.destination, path: `/uk-tours/${destination}` },
        ]}
      />

      <section className="relative overflow-hidden bg-gradient-to-br from-navy via-navy to-brand-deep text-offwhite">
        <StripesBackdrop dark />
        <FloatingBlobs dark />
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-20">
          <Reveal>
            <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-greyblue">
              <Link href="/" className="transition-colors hover:text-offwhite">Home</Link>
              <span className="text-greyblue/50">/</span>
              <Link href="/uk-tours" className="transition-colors hover:text-offwhite">UK Tours</Link>
              <span className="text-greyblue/50">/</span>
              <span className="text-offwhite/90">{tour.destination}</span>
            </nav>
            <Eyebrow className="text-sky-400">Explore the UK</Eyebrow>
            <h1 className="mt-3 font-display text-4xl font-bold leading-[1.08] sm:text-5xl">{tour.destination} Coach Tours</h1>
            <p className="mt-4 max-w-2xl text-lg text-greyblue">{tour.summary}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/get-a-quote" className="group">
                Get a Quote
                <Icon name="arrowRight" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </ButtonLink>
              <a href={settings.phone.href} className={buttonCls("ghostDark")}>
                <Icon name="phone" className="h-4 w-4" />
                Call {settings.phone.display}
              </a>
            </div>
          </Reveal>
          {heroImg && (
            <Reveal delay={0.15}>
              <div className="relative aspect-[3/2] w-full overflow-hidden rounded-3xl bg-white/10 shadow-lg shadow-black/30 ring-1 ring-white/15">
                <Image
                  src={heroImg}
                  alt={`${tour.destination} coach tour`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                  priority
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy/40 via-transparent to-transparent" />
              </div>
            </Reveal>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-20">
        <Reveal>
          <div className="prose" dangerouslySetInnerHTML={{ __html: tour.body }} />

          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink href="/get-a-quote" className="group">
              Get a Quote
              <Icon name="arrowRight" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </ButtonLink>
            <ButtonLink href="/uk-tours" variant="secondary">
              All UK tours
            </ButtonLink>
          </div>
        </Reveal>
      </section>
    </article>
  );
}
