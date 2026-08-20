import Link from "next/link";
import { RouteTimetable } from "@/components/sections/RouteTimetable";
import { PageHero } from "@/components/sections/PageHero";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { buildMetadata } from "@/lib/seo";
import { getRoutes, getSettings, getStops } from "@/lib/directus";

export const metadata = buildMetadata({
  title: "Daily Express Coach Service | London ↔ Midlands & Leicester",
  description:
    "NP Coaches' Daily Express scheduled coach service between London (Southall, Slough) and Coventry, Birmingham, Wolverhampton and Leicester. Timetables and travel info.",
  path: "/daily-express-service",
  titleAbsolute: true,
});

const travelInfo = [
  "Online tickets must be booked at least 1 hour before departure.",
  "Luggage allowance: 1 suitcase (20kg) and 1 hand luggage (7kg) per ticket; extra luggage incurs a surcharge.",
  "Please arrive 15 minutes before departure — services leave on time.",
  "Online tickets are discounted and non-refundable.",
  "We hold no responsibility for personal items, including phones, wallets and baggage.",
];

export default async function DailyExpressPage() {
  const [routes, settings, stops] = await Promise.all([getRoutes(), getSettings(), getStops()]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Scheduled inter-city coach service",
    name: "Daily Express coach service: London to Birmingham, Wolverhampton and Leicester",
    description:
      "Daily scheduled coach service between London (Southall, Slough) and the Midlands. AM and PM departures 7 days a week to Coventry, Birmingham and Wolverhampton; Friday to Monday service to Leicester.",
    areaServed: ["London", "Southall", "Slough", "Coventry", "Birmingham", "Wolverhampton", "Leicester"].map((name) => ({
      "@type": "City",
      name,
    })),
    provider: { "@type": "Organization", name: settings.name, telephone: settings.phone.display },
  };

  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <BreadcrumbJsonLd items={[{ label: "Home", path: "/" }, { label: "Daily Express", path: "/daily-express-service" }]} />

      <PageHero
        eyebrow="Scheduled coach service"
        title="Daily Express Service"
        intro="Our scheduled passenger coach service runs every day between London and the Midlands — with a Friday-to-Monday service to Leicester. Book online or buy on the day of travel; please check the timetable on your day of travel as times can change."
        crumbs={[{ label: "Home", href: "/" }, { label: "Daily Express" }]}
        ctas={[{ label: "Book online", href: "/daily-express-service/book", primary: true }]}
        image={settings.dailyExpressImage}
        imageAlt={settings.dailyExpressImageAlt}
        priority
      >
        <div className="mt-6 max-w-2xl rounded-xl border border-accent/15 bg-white/85 px-4 py-3 text-sm text-navy/80 shadow-sm">
          <strong>Slough stop update:</strong> pickup / drop-off is now Library (Stop W), opposite the Moxy Hotel,
          Wellington St, Slough, SL1 1YG.
        </div>
      </PageHero>


      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="font-display text-2xl font-bold text-navy">Important travel information</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {travelInfo.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 rounded-lg border border-greyblue/30 bg-white px-4 py-3 text-sm text-navy"
            >
              <span className="mt-0.5 text-accent">•</span>
              {item}
            </li>
          ))}
        </ul>

        <h2 className="mt-14 font-display text-2xl font-bold text-navy">Stops we serve</h2>
        <p className="mt-2 text-sm text-navy/70">
          Book a seat between any two stops on the corridor — pick your From and To when you book.
        </p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stops.map((stop) => (
            <li key={stop.code} className="rounded-lg border border-greyblue/30 bg-white px-4 py-3">
              <p className="font-display font-semibold text-navy">{stop.name}</p>
              <p className="mt-1 text-xs text-navy/70">{stop.detail}</p>
            </li>
          ))}
        </ul>

        <h2 className="mt-14 font-display text-2xl font-bold text-navy">Routes &amp; timetables</h2>
        <div className="mt-8 space-y-12">
          {routes.map((route) => (
            <div key={route.slug}>
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h3 className="font-display text-xl font-semibold text-navy">
                  {route.from} to {route.to}
                </h3>
                <span className="rounded-full bg-greyblue/15 px-3 py-1 text-xs font-semibold text-navy/80">
                  {route.days}
                </span>
              </div>
              <p className="mt-2 text-sm text-navy/70">{route.summary}</p>
              <div className="mt-4">
                <RouteTimetable route={route} />
              </div>
              <Link
                href={`/${route.slug}`}
                className="mt-3 inline-block text-sm font-semibold text-accent hover:underline"
              >
                View {route.from} to {route.to} →
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap gap-4">
          <a
            href={settings.phone.href}
            className="rounded-xl bg-accent px-6 py-3 font-semibold text-white shadow-sm shadow-accent/20 transition-all hover:bg-brand-hover hover:shadow-md"
          >
            Call {settings.phone.display}
          </a>
        </div>
      </section>
    </article>
  );
}
