import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { SchoolRouteTimetable } from "@/components/sections/SchoolRouteTimetable";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Reveal } from "@/components/ui/motion";
import { StripesBackdrop, FloatingBlobs } from "@/components/ui/Backdrops";
import { buildMetadata } from "@/lib/seo";
import { assetUrl, getSettings, getSchoolRoutes } from "@/lib/directus";

const TRACK_URL = "https://passenger.shuttleid.uk/";

function routeAnchor(code: string) {
  return code.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export async function generateStaticParams() {
  const settings = await getSettings();
  return settings.schoolTransport.schools.map((s) => ({ school: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ school: string }> }): Promise<Metadata> {
  const { school } = await params;
  const settings = await getSettings();
  const s = settings.schoolTransport.schools.find((x) => x.slug === school);
  if (!s) return {};
  return buildMetadata({
    title: `${s.name} | Home to School Coach Service`,
    description: `${s.name} home-to-school coach routes, timetables and ticket booking with NP Coaches.`,
    path: `/home-to-school/${school}`,
    titleAbsolute: true,
  });
}

export default async function SchoolPage({ params }: { params: Promise<{ school: string }> }) {
  const { school } = await params;
  const [settings, routes] = await Promise.all([getSettings(), getSchoolRoutes(school)]);
  const info = settings.schoolTransport.schools.find((s) => s.slug === school);
  if (!info) notFound();

  const logo = assetUrl(info.logo);

  return (
    <article>
      <BreadcrumbJsonLd
        items={[
          { label: "Home", path: "/" },
          { label: "Home to School", path: "/home-to-school" },
          { label: info.name, path: `/home-to-school/${school}` },
        ]}
      />
      <section className="relative overflow-hidden bg-gradient-to-br from-navy via-navy to-[#161838] text-offwhite">
        <StripesBackdrop dark />
        <FloatingBlobs dark />
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-16">
         <Reveal>
          {/* Breadcrumb */}
          <nav className="flex flex-wrap items-center gap-1.5 text-sm text-greyblue" aria-label="Breadcrumb">
            <Link href="/" className="transition-colors hover:text-offwhite">Home</Link>
            <span className="text-greyblue/50">/</span>
            <Link href="/home-to-school" className="transition-colors hover:text-offwhite">Home to School</Link>
            <span className="text-greyblue/50">/</span>
            <span className="text-offwhite/90">{info.name}</span>
          </nav>

          <div className="mt-6 flex flex-wrap items-center gap-5">
            {logo ? (
              <div className="relative h-20 w-20 shrink-0 rounded-xl bg-white p-2 shadow-lg shadow-black/20">
                <Image src={logo} alt={`${info.name} logo`} fill sizes="80px" className="object-contain p-1" />
              </div>
            ) : null}
            <div>
              <Eyebrow className="text-sky-400">Home to school transport</Eyebrow>
              <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{info.name}</h1>
              <p className="mt-2 max-w-2xl text-greyblue">{info.intro}</p>
            </div>
          </div>

          {/* Booking actions */}
          <div className="mt-8 flex flex-wrap gap-3">
            {info.spacesAvailable ? (
              <a
                href={info.buyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md bg-accent px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90"
              >
                Buy Tickets
              </a>
            ) : (
              info.waitlistUrl && (
                <a
                  href={info.waitlistUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md bg-accent px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Join the waiting list
                </a>
              )
            )}
            <a
              href={TRACK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-greyblue/50 px-6 py-3 font-semibold text-offwhite transition-colors hover:bg-white/5"
            >
              Track the bus
            </a>
          </div>

          {!info.spacesAvailable && (
            <p className="mt-4 rounded-lg bg-amber-400/15 px-4 py-3 text-sm text-amber-200">
              No spaces are currently available — join the waiting list above and we&apos;ll be in touch.
            </p>
          )}
         </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        {/* Route quick-nav */}
        {routes.length > 1 && (
          <nav className="flex flex-wrap gap-2" aria-label="Routes">
            {routes.map((r) => (
              <a
                key={r.code}
                href={`#${routeAnchor(r.code)}`}
                className="rounded-full border border-greyblue/40 px-4 py-1.5 text-sm font-medium text-navy transition-colors hover:bg-greyblue/10"
              >
                {r.code}
              </a>
            ))}
          </nav>
        )}

        <div className="mt-8 space-y-12">
          {routes.map((route) => (
            <div key={route.code} id={routeAnchor(route.code)} className="scroll-mt-24">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="font-display text-xl font-semibold text-navy">
                  {route.code}
                  <span className="ml-2 text-base font-normal text-navy/60">{route.name}</span>
                </h2>
                {info.spacesAvailable && (
                  <a
                    href={info.buyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-accent hover:underline"
                  >
                    Buy tickets →
                  </a>
                )}
              </div>
              <div className="mt-4">
                <SchoolRouteTimetable route={route} />
              </div>
            </div>
          ))}
        </div>

        {routes.length === 0 && (
          <p className="text-sm text-navy/60">
            Route timetables are managed in the CMS. Call {settings.phone.display} for help.
          </p>
        )}

        <p className="mt-10 text-sm text-navy/60">
          Please be at your stop at least 3 minutes before the listed time. Times are approximate — track the vehicle
          for live updates. See the{" "}
          <Link href="/home-to-school" className="text-accent hover:underline">
            home-to-school FAQ &amp; rules
          </Link>
          .
        </p>
      </section>
    </article>
  );
}
