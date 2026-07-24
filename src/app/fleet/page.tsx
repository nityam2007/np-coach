import { FleetCard } from "@/components/sections/FleetCard";
import { PageHero } from "@/components/sections/PageHero";
import { BreadcrumbJsonLd, ItemListJsonLd } from "@/components/seo/JsonLd";
import { buildMetadata } from "@/lib/seo";
import { getFleet } from "@/lib/directus";
import { Reveal } from "@/components/ui/motion";

export const metadata = buildMetadata({
  title: "Our Fleet — 19 to 98 Seat Coaches",
  description:
    "Explore the NP Coaches fleet: Euro-6, ULEZ-compliant mini coaches, midi coaches, executive coaches and double deckers from 19 to 98 seats.",
  path: "/fleet",
  titleAbsolute: true,
});

export default async function FleetPage() {
  const fleet = await getFleet();

  return (
    <>
      <BreadcrumbJsonLd items={[{ label: "Home", path: "/" }, { label: "Fleet", path: "/fleet" }]} />
      <ItemListJsonLd name="NP Coaches fleet" items={fleet.map((v) => ({ name: v.name, path: `/${v.slug}` }))} />

      <PageHero
        eyebrow="Our modern fleet"
        title="Our fleet of coaches"
        intro="Our fleet goes above and beyond the standards set out by law. New, modern vehicles meeting Euro-6 and ULEZ legislation, with real attention to detail and a commitment to comfort."
        crumbs={[{ label: "Home", href: "/" }, { label: "Fleet" }]}
        ctas={[{ label: "Get a Quote", href: "/get-a-quote", primary: true }]}
      >
        <p className="mt-6 font-display text-sm font-semibold uppercase tracking-wide text-greyblue">
          Wide range of seating options: 19 to 98 passengers
        </p>
      </PageHero>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <Reveal className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {fleet.map((vehicle) => (
            <FleetCard key={vehicle.slug} vehicle={vehicle} />
          ))}
        </Reveal>
      </section>
    </>
  );
}
