import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/motion";
import { ButtonLink, buttonCls } from "@/components/ui/Button";
import { assetUrl, getTour, getTours, getSettings, selectPageHeroFallback } from "@/lib/directus";

export async function generateStaticParams() {
  const tours = await getTours();
  return tours.map((tour) => ({ destination: tour.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ destination: string }> }): Promise<Metadata> {
  const { destination } = await params;
  const tour = await getTour(destination);
  if (!tour) return {};
  return { title: { absolute: tour.seoTitle }, description: tour.seoDescription, alternates: { canonical: `/uk-tours/${destination}` } };
}

export default async function TourPage({ params }: { params: Promise<{ destination: string }> }) {
  const { destination } = await params;
  const tour = await getTour(destination);
  if (!tour) notFound();
  const settings = await getSettings();
  const heroFallback = selectPageHeroFallback(settings, `uk-tours/${destination}`);
  const hero = assetUrl(tour.heroImage ?? tour.image ?? heroFallback?.image);
  const heroAlt = tour.heroImageAlt ?? tour.imageAlt ?? heroFallback?.imageAlt ?? "";
  const card = assetUrl(tour.cardImage ?? tour.image);
  const detail = assetUrl(tour.image ?? tour.cardImage);
  const jsonLd = {
    "@context": "https://schema.org", "@type": "Service", serviceType: "Coach hire and UK tours",
    name: `${tour.destination} coach tours from West London`, description: tour.seoDescription, areaServed: "United Kingdom",
    provider: { "@type": "Organization", name: settings.name, telephone: settings.phone.display },
    offers: { "@type": "Offer", priceCurrency: "GBP", url: `${settings.url}/get-a-quote` },
  };

  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <BreadcrumbJsonLd items={[{ label: "Home", path: "/" }, { label: "UK Tours", path: "/uk-tours" }, { label: tour.destination, path: `/uk-tours/${destination}` }]} />
      <section className="relative flex min-h-[34rem] items-end overflow-hidden bg-navy text-offwhite lg:aspect-[21/9] lg:min-h-0">
        {hero && <Image src={hero} alt={heroAlt} fill priority sizes="100vw" className="z-0 object-cover" />}
        <div className="absolute inset-0 z-[1] bg-gradient-to-r from-navy/95 via-navy/65 to-navy/20" />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
          <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-greyblue">
            <Link href="/" className="hover:text-white">Home</Link><span>/</span><Link href="/uk-tours" className="hover:text-white">UK Tours</Link><span>/</span><span className="text-white">{tour.destination}</span>
          </nav>
          <Eyebrow className="text-sky-400">Explore the UK</Eyebrow>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold leading-[1.08] sm:text-5xl lg:text-6xl">{tour.destination} Coach Tours</h1>
          <p className="mt-4 max-w-2xl text-lg text-greyblue">{tour.summary}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/get-a-quote" className="group">Get a Quote <Icon name="arrowRight" className="h-4 w-4 transition-transform group-hover:translate-x-1" /></ButtonLink>
            <a href={settings.phone.href} className={buttonCls("ghostDark")}><Icon name="phone" className="h-4 w-4" />Call {settings.phone.display}</a>
          </div>
        </div>
      </section>

      <section className="bg-offwhite px-4 py-16 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-7xl space-y-16 lg:space-y-24">
          <Reveal className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
            {card && <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-lg"><Image src={card} alt={tour.cardImageAlt ?? tour.imageAlt ?? ""} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" /></div>}
            <div className={card ? "" : "lg:col-span-2 lg:mx-auto lg:max-w-3xl"}>
              <Eyebrow>Discover {tour.destination}</Eyebrow>
              <h2 className="mt-3 font-display text-3xl font-bold text-navy">{tour.destination}</h2>
              <div className="prose mt-5" dangerouslySetInnerHTML={{ __html: tour.body }} />
            </div>
          </Reveal>
          <Reveal className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
            <div className="lg:order-2">
              {detail && <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-lg"><Image src={detail} alt={tour.imageAlt ?? ""} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" /></div>}
            </div>
            <div className="lg:order-1">
              <Eyebrow>{settings.tourPage.journeyEyebrow}</Eyebrow>
              <h2 className="mt-3 font-display text-3xl font-bold text-navy">{settings.tourPage.journeyHeading}</h2>
              <p className="mt-5 leading-7 text-navy/70">{settings.tourPage.journeyBody}</p>
              <div className="mt-8 flex flex-wrap gap-3"><ButtonLink href="/get-a-quote">Get a Quote</ButtonLink><ButtonLink href="/uk-tours" variant="secondary">All UK tours</ButtonLink></div>
            </div>
          </Reveal>
        </div>
      </section>
    </article>
  );
}