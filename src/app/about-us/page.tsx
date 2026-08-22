import type { Metadata } from "next";
import { getFleet, getPage, getSettings } from "@/lib/directus";
import { PageHero } from "@/components/sections/PageHero";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/motion";
import { CmsHtml } from "@/components/ui/CmsHtml";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "About NP Coaches | Family-Run Coach Hire Since 1999",
  description: "Meet NP Coaches, the family-run West London coach operator serving schools, businesses, tours and private groups across the UK since 1999.",
  alternates: { canonical: "/about-us" },
};

const principles = [
  { icon: "shield" as const, title: "Safety first", text: "Every journey is planned around dependable vehicles, professional drivers and the people travelling with us." },
  { icon: "users" as const, title: "Family-run service", text: "We combine the attention of a local operator with the capacity to serve groups across the UK." },
  { icon: "bus" as const, title: "Travel that fits", text: "From school transport and tours to events and scheduled travel, we match the right coach to the journey." },
];

export default async function AboutPage() {
  const [page, settings, fleet] = await Promise.all([getPage("about-us"), getSettings(), getFleet()]);
  const seats = fleet.map((vehicle) => vehicle.seats).filter(Number.isFinite);
  const minSeats = seats.length ? Math.min(...seats) : 19;
  const maxSeats = seats.length ? Math.max(...seats) : 98;

  return (
    <article>
      <BreadcrumbJsonLd items={[{ label: "Home", path: "/" }, { label: "About Us", path: "/about-us" }]} />
      <PageHero
        eyebrow="Established 1999"
        title={page?.title ?? "About NP Coaches"}
        intro={page?.subtitle ?? "Family-run coach hire from West London, trusted for comfortable and dependable journeys across the UK."}
        crumbs={[{ label: "Home", href: "/" }, { label: "About Us" }]}
        ctas={[
          { label: "Explore our fleet", href: "/fleet", primary: true, icon: "arrowRight" },
          { label: "Get a quote", href: "/get-a-quote", icon: "briefcase" },
        ]}
        image={page?.image}
        imageAlt={page?.imageAlt}
        priority
      />

      <section className="bg-offwhite">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:py-20">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">Our story</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-navy sm:text-4xl">Local roots. Nationwide journeys.</h2>
            <CmsHtml className="prose mt-6 max-w-2xl" html={page?.body ?? ""} />
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/get-a-quote">Plan a journey with us</ButtonLink>
              <a href={settings.phone.href} className="inline-flex items-center gap-2 rounded-xl border border-navy/15 bg-white px-6 py-3 font-semibold text-navy shadow-sm transition-colors hover:border-accent/40 hover:bg-navy hover:text-white"><Icon name="phone" className="h-4 w-4" /> {settings.phone.display}</a>
            </div>
          </Reveal>

        </div>
      </section>

      <section className="bg-tint-soft">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">What guides us</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-navy">Dependable service, at every stop</h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {principles.map((principle) => (
              <Reveal key={principle.title}>
                <div className="h-full rounded-2xl border border-greyblue/20 bg-white p-6 shadow-sm shadow-navy/5">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent"><Icon name={principle.icon} className="h-5 w-5" /></span>
                  <h3 className="mt-5 font-display text-xl font-semibold text-navy">{principle.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-navy/70">{principle.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-navy text-offwhite">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:py-20">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-400">From our Iver depot</p>
            <h2 className="mt-3 font-display text-3xl font-bold">A fleet ready for every group</h2>
            <p className="mt-4 max-w-2xl text-greyblue">Our current fleet covers groups from {minSeats} to {maxSeats} seats, giving schools, businesses and private groups a practical, comfortable option for travel across the UK.</p>
          </div>
          <ButtonLink href="/fleet" variant="inverse">View the fleet</ButtonLink>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto grid max-w-7xl gap-4 px-4 py-8 sm:grid-cols-3 sm:px-6">
            {settings.stats.slice(0, 3).map((stat) => <div key={stat.label}><p className="font-display text-3xl font-bold">{stat.value}</p><p className="mt-1 text-sm text-greyblue">{stat.label}</p></div>)}
          </div>
        </div>
      </section>
    </article>
  );
}
