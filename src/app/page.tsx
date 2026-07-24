import { Hero } from "@/components/sections/Hero";
import { ServiceCards } from "@/components/sections/ServiceCards";
import { AccreditationStrip } from "@/components/sections/AccreditationStrip";
import { FleetCarousel } from "@/components/sections/FleetCarousel";
import { SchoolTransportBlock } from "@/components/sections/SchoolTransportBlock";
import { CoverageMap } from "@/components/sections/CoverageMap";
import { StatsBand } from "@/components/sections/StatsBand";
import { TestimonialCarousel } from "@/components/sections/TestimonialCarousel";
import { FaqAccordion } from "@/components/sections/FaqAccordion";
import { Reveal, Tilt } from "@/components/ui/motion";
import { getFleet, getServices, getSettings, getStops, getTestimonials } from "@/lib/directus";

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

      {/* School transport + nationwide coverage */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="grid gap-6 lg:grid-cols-12">
          <Reveal className="lg:col-span-7">
            <Tilt max={4} className="h-full">
              <SchoolTransportBlock block={homepage.school} image={settings.schoolImage} />
            </Tilt>
          </Reveal>
          <Reveal delay={0.12} className="lg:col-span-5">
            <Tilt max={4} className="h-full">
              <CoverageMap block={homepage.coverage} areas={settings.coverage} />
            </Tilt>
          </Reveal>
        </div>
      </section>

      {/* Testimonials + stats */}
      <section className="bg-white">
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

      <FaqAccordion faqs={settings.faqs} />
    </>
  );
}
