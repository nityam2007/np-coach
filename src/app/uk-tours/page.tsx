import Link from "next/link";
import Image from "next/image";
import { assetUrl, getSettings, getTours } from "@/lib/directus";
import { PageHero } from "@/components/sections/PageHero";
import { BreadcrumbJsonLd, ItemListJsonLd } from "@/components/seo/JsonLd";
import { Icon } from "@/components/ui/Icon";
import { featureIcon } from "@/lib/feature-icon";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "UK Coach Tours & Day Trips",
  description: "Book coach tours and day trips across the UK with NP Coaches — London, Windsor, Bath, Salisbury, Cornwall and more in comfortable, ULEZ-compliant luxury coaches.",
  path: "/uk-tours",
});

export default async function UkToursPage() {
  const [tours, settings] = await Promise.all([getTours(), getSettings()]);
  const amenities = settings.tourPage.amenities;

  return (
    <>
      <BreadcrumbJsonLd items={[{ label: "Home", path: "/" }, { label: "UK Tours", path: "/uk-tours" }]} />
      <ItemListJsonLd name="UK coach tour destinations" items={tours.map((tour) => ({ name: tour.destination, path: `/uk-tours/${tour.slug}` }))} />
      <PageHero eyebrow="Explore the UK" title="UK Tours" intro="First-class coach tours and day trips across the British Isles. Tell us your itinerary and we'll provide prompt, reliable transport in clean, comfortable luxury coaches." crumbs={[{ label: "Home", href: "/" }, { label: "UK Tours" }]} ctas={[{ label: "Get a Quote", href: "/get-a-quote", primary: true }]}>
        <ul className="mt-6 flex flex-wrap gap-2">
          {amenities.map((amenity) => (
            <li key={amenity} className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-white/80 px-3 py-1.5 text-sm text-navy/70 shadow-sm">
              <Icon name={featureIcon(amenity)} className="h-4 w-4 text-accent" />{amenity}
            </li>
          ))}
        </ul>
      </PageHero>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="font-display text-2xl font-bold text-navy">Popular destinations</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tours.map((tour) => {
            const image = assetUrl(tour.cardImage ?? tour.image);
            return (
              <Link key={tour.slug} href={`/uk-tours/${tour.slug}`} className="group flex flex-col overflow-hidden rounded-2xl border border-greyblue/25 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
                <div className="relative aspect-[3/2] w-full overflow-hidden bg-greyblue/10">
                  {image && <Image src={image} alt={tour.cardImageAlt ?? tour.imageAlt ?? ""} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-navy/45 via-transparent to-transparent" />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="font-display text-xl font-semibold text-navy">{tour.destination}</h3>
                  <p className="mt-2 grow text-sm leading-6 text-navy/70">{tour.summary}</p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-accent">View destination <Icon name="arrowRight" className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
                </div>
              </Link>
            );
          })}
        </div>
        <div className="mt-12 rounded-2xl bg-greyblue/10 p-8 text-center">
          <h2 className="font-display text-xl font-bold text-navy">Have a destination in mind?</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-navy/70">We provide the travel, not the itinerary — give us your plan and group size and we&apos;ll quote you a comfortable coach with a professional driver.</p>
          <Link href="/get-a-quote" className="mt-6 inline-block rounded-xl bg-accent px-6 py-3 font-semibold text-white shadow-sm transition-all hover:bg-brand-hover">Get a Quote</Link>
        </div>
      </section>
    </>
  );
}