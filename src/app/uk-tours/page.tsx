import Link from "next/link";
import Image from "next/image";
import { assetUrl, getTours } from "@/lib/directus";
import { PageHero } from "@/components/sections/PageHero";
import { BreadcrumbJsonLd, ItemListJsonLd } from "@/components/seo/JsonLd";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "UK Coach Tours & Day Trips",
  description:
    "Book coach tours and day trips across the UK with NP Coaches — London, Windsor, Bath, Salisbury, Cornwall and more in comfortable, ULEZ-compliant luxury coaches.",
  path: "/uk-tours",
});

const amenities = ["Air conditioning", "Reclining seats", "USB & plug sockets", "On-board WC", "DVD players", "Arm rests"];

export default async function UkToursPage() {
  const tours = await getTours();

  return (
    <>
      <BreadcrumbJsonLd items={[{ label: "Home", path: "/" }, { label: "UK Tours", path: "/uk-tours" }]} />
      <ItemListJsonLd name="UK coach tour destinations" items={tours.map((t) => ({ name: t.destination, path: `/uk-tours/${t.slug}` }))} />

      <PageHero
        eyebrow="Explore the UK"
        title="UK Tours"
        intro="First-class coach tours and day trips across the British Isles. Tell us your itinerary and we'll provide prompt, reliable transport in clean, comfortable luxury coaches."
        crumbs={[{ label: "Home", href: "/" }, { label: "UK Tours" }]}
        ctas={[{ label: "Get a Quote", href: "/get-a-quote", primary: true }]}
      >
        <ul className="mt-6 flex flex-wrap gap-2">
          {amenities.map((a) => (
            <li key={a} className="rounded-full bg-white/10 px-3 py-1 text-sm text-offwhite ring-1 ring-white/10">
              {a}
            </li>
          ))}
        </ul>
      </PageHero>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="font-display text-2xl font-bold text-navy">Popular destinations</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tours.map((tour) => {
            const img = assetUrl(tour.image);
            return (
              <Link
                key={tour.slug}
                href={`/uk-tours/${tour.slug}`}
                className="group flex flex-col overflow-hidden rounded-xl border border-greyblue/30 bg-white transition-shadow hover:shadow-lg"
              >
                <div className="relative aspect-[3/2] w-full overflow-hidden bg-greyblue/10">
                  {img ? (
                    <Image
                      src={img}
                      alt={`${tour.destination} coach tour`}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="font-display text-lg font-semibold text-navy">{tour.destination}</h3>
                  <p className="mt-2 grow text-sm text-navy/70">{tour.summary}</p>
                  <span className="mt-4 inline-block text-sm font-semibold text-accent group-hover:underline">
                    View destination →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-12 rounded-xl bg-greyblue/10 p-8 text-center">
          <h2 className="font-display text-xl font-bold text-navy">Have a destination in mind?</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-navy/70">
            We provide the travel, not the itinerary — give us your plan and group size and we&apos;ll quote you a
            comfortable coach with a professional driver. Group discounts on major attractions can often be arranged.
          </p>
          <Link
            href="/get-a-quote"
            className="mt-6 inline-block rounded-xl bg-accent px-6 py-3 font-semibold text-white shadow-sm shadow-accent/20 transition-all hover:bg-brand-hover hover:shadow-md"
          >
            Get a Quote
          </Link>
        </div>
      </section>
    </>
  );
}
