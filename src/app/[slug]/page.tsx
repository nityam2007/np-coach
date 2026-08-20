import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FleetDetail } from "@/components/sections/FleetDetail";
import { notFound } from "next/navigation";
import { PageTemplate } from "@/components/sections/PageTemplate";
import { RouteTimetable } from "@/components/sections/RouteTimetable";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/motion";
import { ButtonLink, buttonCls } from "@/components/ui/Button";
import { assetUrl, getFleet, getFleetVehicle, getPage, getPages, getRoute, getRoutes, getSettings, getStops } from "@/lib/directus";

// Root-level slugs resolve to a fleet vehicle, an editable content page, or a Daily Express route.
export async function generateStaticParams() {
  const [fleet, pages, routes] = await Promise.all([getFleet(), getPages(), getRoutes()]);
  return [
    ...fleet.map((v) => ({ slug: v.slug })),
    ...pages.map((p) => ({ slug: p.slug })),
    ...routes.map((r) => ({ slug: r.slug })),
  ];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const vehicle = await getFleetVehicle(slug);
  if (vehicle)
    return { title: { absolute: vehicle.seoTitle }, description: vehicle.seoDescription, alternates: { canonical: `/${slug}` } };
  const page = await getPage(slug);
  // `absolute` skips the layout template; page `seo_title` should be the complete title (include the brand).
  if (page) return { title: { absolute: page.seoTitle }, description: page.seoDescription, alternates: { canonical: `/${slug}` } };
  const route = await getRoute(slug);
  if (route)
    return { title: { absolute: route.seoTitle }, description: route.seoDescription, alternates: { canonical: `/${slug}` } };
  return {};
}

export default async function SlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // 1) Fleet vehicle?
  const vehicle = await getFleetVehicle(slug);
  if (vehicle) {
    const settings = await getSettings();
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Service",
      name: `${vehicle.name} Hire`,
      description: vehicle.seoDescription,
      areaServed: "United Kingdom",
      provider: { "@type": "Organization", name: settings.name, telephone: settings.phone.display },
    };
    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <FleetDetail vehicle={vehicle} settings={settings} />
      </>
    );
  }
  // 2) Editable content page?
  const page = await getPage(slug);
  if (page) return <PageTemplate page={page} />;

  // 3) Daily Express route?
  const route = await getRoute(slug);
  if (route) {
    const [settings, stops] = await Promise.all([getSettings(), getStops()]);
    // Best-effort prefill: match the route's first/last stop name to a corridor stop code.
    const matchCode = (place?: string) =>
      stops.find((s) => place && (s.name.includes(place.split(" ")[0]) || place.includes(s.name.split(" ")[0])))?.code;
    const fromCode = matchCode(route.stops[0]?.place);
    const toCode = matchCode(route.stops[route.stops.length - 1]?.place);
    const bookHref =
      fromCode && toCode
        ? `/daily-express-service/book?from=${fromCode}&to=${toCode}`
        : "/daily-express-service/book";
    const routeHero = assetUrl(route.image);
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "BusTrip",
      provider: { "@type": "Organization", name: settings.name, telephone: settings.phone.display },
      departureBusStop: { "@type": "BusStop", name: route.stops[0]?.place, description: route.stops[0]?.detail },
      arrivalBusStop: {
        "@type": "BusStop",
        name: route.stops[route.stops.length - 1]?.place,
        description: route.stops[route.stops.length - 1]?.detail,
      },
    };

    return (
      <article>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <BreadcrumbJsonLd
          items={[
            { label: "Home", path: "/" },
            { label: "Daily Express", path: "/daily-express-service" },
            { label: `${route.from} to ${route.to}`, path: `/${slug}` },
          ]}
        />

        <section className="relative isolate overflow-hidden bg-gradient-to-br from-navy via-navy to-brand-deep text-offwhite">
          {routeHero && <Image src={routeHero} alt={route.imageAlt ?? `${route.from} to ${route.to} coach service`} fill priority sizes="100vw" className="object-cover" />}
          {routeHero && <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-navy/95 via-navy/78 to-navy/42" />}
          {routeHero && <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-navy/75 via-transparent to-navy/20" />}
          <div className="mx-auto flex min-h-[clamp(28rem,42.85vw,42rem)] max-w-7xl items-center px-4 py-16 sm:px-6 lg:py-20">
            <Reveal>
              <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-greyblue">
                <Link href="/" className="transition-colors hover:text-offwhite">Home</Link>
                <span className="text-greyblue/50">/</span>
                <Link href="/daily-express-service" className="transition-colors hover:text-offwhite">Daily Express</Link>
                <span className="text-greyblue/50">/</span>
                <span className="text-offwhite/90">{route.from} to {route.to}</span>
              </nav>
              <Eyebrow className="text-sky-400">Scheduled coach service</Eyebrow>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <h1 className="inline-flex flex-wrap items-center gap-3 font-display text-4xl font-bold leading-[1.08] sm:text-5xl">
                  {route.from}
                  <Icon name="arrowRight" className="h-7 w-7 text-accent" />
                  {route.to}
                </h1>
                <span className="rounded-full bg-accent px-3 py-1 text-sm font-semibold text-white shadow-lg shadow-accent/25">
                  {route.days}
                </span>
              </div>
              <p className="mt-4 max-w-2xl text-lg text-greyblue">{route.summary}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href={bookHref} className="group">
                  Book this route
                  <Icon name="arrowRight" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </ButtonLink>
                <a href={settings.phone.href} className={buttonCls("ghostDark")}>
                  <Icon name="phone" className="h-4 w-4" />
                  Call {settings.phone.display}
                </a>
              </div>
            </Reveal>
          </div>
        </section>


        <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-20">
          <Reveal>
            <Eyebrow>Timetable</Eyebrow>
            <h2 className="mt-3 font-display text-3xl font-bold text-navy sm:text-4xl">Departure times</h2>
            <p className="mt-2 text-sm text-navy/70">
              Times can change — please check on your day of travel. Online tickets must be booked at least 1 hour before
              departure and are non-refundable.
            </p>
            <div className="mt-6">
              <RouteTimetable route={route} />
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              <ButtonLink href={bookHref} className="group">
                Book this route
                <Icon name="arrowRight" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </ButtonLink>
              <ButtonLink href="/daily-express-service" variant="secondary">
                All routes
              </ButtonLink>
            </div>
          </Reveal>
        </section>
      </article>
    );
  }

  // 4) None.
  notFound();
}
