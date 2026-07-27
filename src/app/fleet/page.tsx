import { FleetCard } from "@/components/sections/FleetCard";
import { PageHero } from "@/components/sections/PageHero";
import { FleetExperience } from "@/components/sections/FleetExperience";
import { BreadcrumbJsonLd, ItemListJsonLd } from "@/components/seo/JsonLd";
import { buildMetadata } from "@/lib/seo";
import { getFleet, getSettings } from "@/lib/directus";
import { Reveal } from "@/components/ui/motion";
import { Eyebrow } from "@/components/ui/Eyebrow";

export const metadata = buildMetadata({
  title: "Our Fleet — 19 to 98 Seat Coaches",
  description:
    "Explore the NP Coaches fleet: Euro-6, ULEZ-compliant mini coaches, midi coaches, executive coaches and double deckers from 19 to 98 seats.",
  path: "/fleet",
  titleAbsolute: true,
});

export default async function FleetPage() {
  const [fleet, settings] = await Promise.all([getFleet(), getSettings()]);

  return (
    <>
      <BreadcrumbJsonLd items={[{ label: "Home", path: "/" }, { label: "Fleet", path: "/fleet" }]} />
      <ItemListJsonLd name="NP Coaches fleet" items={fleet.map((v) => ({ name: v.name, path: `/${v.slug}` }))} />

      <PageHero
        eyebrow={settings.fleetPage.eyebrow}
        title={settings.fleetPage.title}
        intro={settings.fleetPage.introHeading}
        crumbs={[{ label: "Home", href: "/" }, { label: "Fleet" }]}
        ctas={[{ ...settings.fleetPage.charterCta, primary: true }]}
      >
        <p className="mt-6 font-display text-sm font-semibold uppercase tracking-wide text-greyblue">
          {settings.fleetPage.seatingLabel}
        </p>
      </PageHero>

      <section className="bg-white">
        <Reveal className="mx-auto max-w-4xl px-4 py-14 text-center sm:px-6 lg:py-16">
          <Eyebrow>{settings.fleetPage.introEyebrow}</Eyebrow>
          <h2 className="mt-3 font-display text-3xl font-bold text-navy sm:text-4xl">
            {settings.fleetPage.introHeading}
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-navy/70 sm:text-lg">{settings.fleetPage.introBody}</p>
        </Reveal>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <Reveal className="mb-9 text-center">
          <Eyebrow>{settings.fleetPage.seatingLabel}</Eyebrow>
          <h2 className="mt-3 font-display text-3xl font-bold text-navy sm:text-4xl">{settings.fleetPage.gridHeading}</h2>
        </Reveal>
        <Reveal className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {fleet.map((vehicle) => (
            <FleetCard key={vehicle.slug} vehicle={vehicle} />
          ))}
        </Reveal>
      </section>

      <FleetExperience content={settings.fleetPage} image={fleet[0]?.image} />
    </>
  );
}
