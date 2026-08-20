import { FleetShowcase } from "@/components/sections/FleetShowcase";
import { PageHero } from "@/components/sections/PageHero";
import { FleetExperience } from "@/components/sections/FleetExperience";
import { BreadcrumbJsonLd, ItemListJsonLd } from "@/components/seo/JsonLd";
import { buildMetadata } from "@/lib/seo";
import { getFleet, getSettings } from "@/lib/directus";
import { Reveal } from "@/components/ui/motion";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Icon } from "@/components/ui/Icon";

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
        image={fleet[0]?.image}
        imageAlt={fleet[0]?.imageAlt}
        priority
      >
        <p className="mt-6 font-display text-sm font-semibold uppercase tracking-wide text-greyblue">
          {settings.fleetPage.seatingLabel}
        </p>
      </PageHero>

      <section className="relative overflow-hidden bg-offwhite">
        <div className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
        <Reveal className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
          <div className="overflow-hidden rounded-3xl border border-greyblue/20 bg-white shadow-xl shadow-navy/10">
            <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
              <div className="relative overflow-hidden bg-navy p-8 text-white sm:p-10 lg:p-12">
                <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full border-[36px] border-white/5" />
                <Eyebrow className="text-sky-300">{settings.fleetPage.introEyebrow}</Eyebrow>
                <h2 className="relative mt-3 max-w-xl font-display text-3xl font-bold sm:text-4xl">{settings.fleetPage.introHeading}</h2>
              </div>
              <div className="p-8 sm:p-10 lg:p-12">
                <p className="max-w-2xl text-base leading-7 text-navy/70 sm:text-lg">{settings.fleetPage.introBody}</p>
                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  {settings.fleetPage.introHighlights.map((highlight) => (
                    <div key={highlight.label} className="rounded-2xl border border-greyblue/20 bg-tint-soft p-4">
                      <Icon name={highlight.icon} className="h-6 w-6 text-accent" />
                      <p className="mt-3 font-display text-xl font-bold text-navy">{highlight.value}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-navy/55">{highlight.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <Reveal className="mb-9 text-center">
          <Eyebrow>{settings.fleetPage.seatingLabel}</Eyebrow>
          <h2 className="mt-3 font-display text-3xl font-bold text-navy sm:text-4xl">{settings.fleetPage.gridHeading}</h2>
        </Reveal>
        <FleetShowcase vehicles={fleet} />
      </section>

      <FleetExperience content={settings.fleetPage} image={fleet[0]?.image} />
    </>
  );
}
