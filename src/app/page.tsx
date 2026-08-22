import { Hero } from "@/components/sections/Hero";
import { ServiceCards } from "@/components/sections/ServiceCards";
import { AccreditationStrip } from "@/components/sections/AccreditationStrip";
import { FleetCarousel } from "@/components/sections/FleetCarousel";
import { SchoolTransportBlock } from "@/components/sections/SchoolTransportBlock";
import { CoverageMap } from "@/components/sections/CoverageMap";
import { StatsBand } from "@/components/sections/StatsBand";
import { TestimonialCarousel } from "@/components/sections/TestimonialCarousel";
import { FaqAccordion } from "@/components/sections/FaqAccordion";
import { Reveal } from "@/components/ui/motion";
import { getFleet, getServices, getSettings, getStops, getTestimonials } from "@/lib/directus";

import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "NP Coaches — Premium Coach Transport Across the UK",
  description: "Family-run coach hire, UK tours, Daily Express and home-to-school transport from West London since 1999.",
  path: "/",
  titleAbsolute: true,
});
export default async function HomePage() {
  const [settings, services, fleet, testimonials, stops] = await Promise.all([
    getSettings(),
    getServices(),
    getFleet(),
    getTestimonials(),
    getStops(),
  ]);
  const { homepage } = settings;

  return (
    <>
      <Hero settings={settings} stops={stops} />

      <AccreditationStrip items={settings.accreditations} logos={settings.accreditationLogos} />

      <ServiceCards
        services={services}
        eyebrow={homepage.servicesEyebrow}
        heading={homepage.servicesHeading}
        body={homepage.servicesBody}
      />

      <FleetCarousel
        fleet={fleet}
        eyebrow={homepage.fleetEyebrow}
        heading={homepage.fleetHeading}
        body={homepage.fleetBody}
        cta={homepage.fleetCta}
      />

      {/* Dedicated two-column highlights: school transport and nationwide coverage. */}
      <section className="bg-offwhite">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
          <Reveal>
            <SchoolTransportBlock
              block={homepage.school}
              image={settings.schoolImage}
              imageAlt={settings.schoolImageAlt}
            />
          </Reveal>
        </div>
      </section>

      <section className="bg-tint-soft">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
          <Reveal>
            <CoverageMap block={homepage.coverage} depot={`${settings.address.city}, ${settings.address.county}`} />
          </Reveal>
        </div>
      </section>

      {/* Testimonials + stats */}
      <section className="bg-tint-soft">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-3 lg:items-stretch">
            <Reveal className="lg:col-span-2">
              <TestimonialCarousel
                testimonials={testimonials}
                eyebrow={homepage.clientsEyebrow}
                heading={homepage.clientsHeading}
                rating={homepage.heroRating}
              />
            </Reveal>
            <Reveal delay={0.12}>
              <StatsBand stats={settings.stats} />
            </Reveal>
          </div>
        </div>
      </section>

      <FaqAccordion faqs={settings.faqs.slice(0, 4)} />
    </>
  );
}
