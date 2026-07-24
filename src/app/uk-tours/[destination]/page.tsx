import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Icon } from "@/components/ui/Icon";
import { Reveal, Tilt, Magnetic } from "@/components/ui/motion";
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

      <section className="relative overflow-hidden bg-gradient-to-br from-navy via-navy to-[#161838] text-offwhite">
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
              <Magnetic>
                <Link
                  href="/get-a-quote"
                  className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-accent to-[#1e4fd6] px-6 py-3 font-semibold text-white shadow-lg shadow-accent/25 transition-all hover:shadow-xl hover:brightness-110 active:scale-[0.98]"
                >
                  Get a Quote
                  <Icon name="arrowRight" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Magnetic>
              <a
                href={settings.phone.href}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-6 py-3 font-semibold text-offwhite transition-colors hover:bg-white/10"
              >
                <Icon name="phone" className="h-4 w-4" />
                Call {settings.phone.display}
              </a>
            </div>
          </Reveal>
          {heroImg && (
            <Reveal delay={0.15}>
              <Tilt max={6}>
                <div className="group relative aspect-[3/2] w-full overflow-hidden rounded-3xl bg-white/10 shadow-2xl shadow-black/40 ring-1 ring-white/15 transition-transform duration-700 ease-out group-hover:scale-[1.02]">
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
              </Tilt>
            </Reveal>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:py-16">
        <Reveal>
          <div className="prose" dangerouslySetInnerHTML={{ __html: tour.body }} />

          <div className="mt-10 flex flex-wrap gap-3">
            <Magnetic>
              <Link
                href="/get-a-quote"
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-accent to-[#1e4fd6] px-6 py-3 font-semibold text-white shadow-lg shadow-accent/25 transition-all hover:shadow-xl hover:brightness-110 active:scale-[0.98]"
              >
                Get a Quote
                <Icon name="arrowRight" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Magnetic>
            <Link
              href="/uk-tours"
              className="inline-flex items-center gap-2 rounded-xl border border-navy/15 bg-white px-6 py-3 font-semibold text-navy shadow-sm transition-all hover:border-accent/40 hover:bg-navy hover:text-white active:scale-[0.98]"
            >
              All UK tours
            </Link>
          </div>
        </Reveal>
      </section>
    </article>
  );
}
