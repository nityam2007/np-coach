import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { PageTemplate } from "@/components/sections/PageTemplate";
import { RouteTimetable } from "@/components/sections/RouteTimetable";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Icon } from "@/components/ui/Icon";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/motion";
import { ButtonLink, buttonCls } from "@/components/ui/Button";
import { StripesBackdrop, FloatingBlobs } from "@/components/ui/Backdrops";
import { featureIcon } from "@/lib/feature-icon";
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

    const heroImg = assetUrl(vehicle.image);
    return (
      <article>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <BreadcrumbJsonLd
          items={[{ label: "Home", path: "/" }, { label: "Fleet", path: "/fleet" }, { label: vehicle.name, path: `/${slug}` }]}
        />

        {/* Hero — animated navy, copy + tilted photo */}
        <section className="relative overflow-hidden bg-gradient-to-br from-navy via-navy to-brand-deep text-offwhite">
          <StripesBackdrop dark />
          <FloatingBlobs dark />
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-20">
            <Reveal>
              <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-greyblue">
                <Link href="/" className="transition-colors hover:text-offwhite">Home</Link>
                <span className="text-greyblue/50">/</span>
                <Link href="/fleet" className="transition-colors hover:text-offwhite">Fleet</Link>
                <span className="text-greyblue/50">/</span>
                <span className="text-offwhite/90">{vehicle.name}</span>
              </nav>
              <Eyebrow className="text-sky-400">Our modern fleet</Eyebrow>
              <div className="mt-3 flex flex-wrap items-baseline gap-4">
                <h1 className="font-display text-4xl font-bold leading-[1.08] sm:text-5xl">{vehicle.name}</h1>
                <span className="rounded-full bg-accent px-3 py-1 text-sm font-semibold text-white shadow-lg shadow-accent/25">
                  {vehicle.seats} seats
                </span>
              </div>
              <p className="mt-4 max-w-2xl text-lg text-greyblue">{vehicle.summary}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/get-a-quote" className="group">
                  Get a Quote
                  <Icon name="arrowRight" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </ButtonLink>
                <a href={settings.phone.href} className={buttonCls("ghostDark")}>
                  <Icon name="phone" className="h-4 w-4" />
                  Call {settings.phone.display}
                </a>
              </div>
            </Reveal>

            {heroImg && (
              <Reveal delay={0.15}>
                <div className="relative aspect-[3/2] w-full overflow-hidden rounded-3xl bg-white/10 shadow-lg shadow-black/30 ring-1 ring-white/15">
                  <Image
                    src={heroImg}
                    alt={`${vehicle.name} coach`}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover"
                    priority
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy/40 via-transparent to-transparent" />
                </div>
              </Reveal>
            )}
          </div>
        </section>

        {/* On board — icon spec cards, staggered */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
          <Reveal>
            <Eyebrow>On board</Eyebrow>
            <h2 className="mt-3 font-display text-3xl font-bold text-navy sm:text-4xl">Comfort &amp; features</h2>
          </Reveal>
          <Stagger className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" gap={0.06}>
            {vehicle.features.map((feature) => (
              <StaggerItem key={feature}>
                <div className="group flex h-full items-center gap-3 rounded-2xl border border-greyblue/20 bg-white px-5 py-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-lg hover:shadow-navy/5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent transition-colors group-hover:bg-accent group-hover:text-white">
                    <Icon name={featureIcon(feature)} className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-medium text-navy">{feature}</span>
                </div>
              </StaggerItem>
            ))}
          </Stagger>

          {vehicle.gallery && vehicle.gallery.length > 0 && (
            <>
              <Reveal>
                <Eyebrow className="mt-16">Gallery</Eyebrow>
                <h2 className="mt-3 font-display text-3xl font-bold text-navy sm:text-4xl">Take a closer look</h2>
              </Reveal>
              <Stagger className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" gap={0.06}>
                {vehicle.gallery.map((id) => {
                  const src = assetUrl(id);
                  return src ? (
                    <StaggerItem key={id}>
                      <div className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-white ring-1 ring-greyblue/15">
                        <Image
                          src={src}
                          alt={`${vehicle.name} interior`}
                          fill
                          sizes="(max-width: 1024px) 50vw, 33vw"
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      </div>
                    </StaggerItem>
                  ) : null;
                })}
              </Stagger>
            </>
          )}
        </section>

        {/* Closing CTA band */}
        <section className="relative overflow-hidden bg-gradient-to-br from-navy via-navy to-brand-deep text-offwhite">
          <StripesBackdrop dark />
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
            <Reveal className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-2xl font-bold sm:text-3xl">Need the {vehicle.name.toLowerCase()}?</h2>
                <p className="mt-2 text-greyblue">Tell us your journey and group size for a free, no-obligation quote.</p>
              </div>
              <ButtonLink href="/get-a-quote">
                Get a Quote
                <Icon name="arrowRight" className="h-4 w-4" />
              </ButtonLink>
            </Reveal>
          </div>
        </section>
      </article>
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

        <section className="relative overflow-hidden bg-gradient-to-br from-navy via-navy to-brand-deep text-offwhite">
          <StripesBackdrop dark />
          <FloatingBlobs dark />
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
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
