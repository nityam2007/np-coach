import Image from "next/image";
import Link from "next/link";
import type { FleetVehicle } from "@/lib/site-config";
import type { SiteSettings } from "@/lib/directus";
import { assetUrl, selectPageHeroFallback } from "@/lib/directus";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { ButtonLink, buttonCls } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Icon } from "@/components/ui/Icon";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/motion";
import { ImageLightboxGallery } from "@/components/ui/ImageLightboxGallery";
import { featureIcon } from "@/lib/feature-icon";
import { FleetExperience } from "@/components/sections/FleetExperience";

export function FleetDetail({
  vehicle,
  settings,
}: {
  vehicle: FleetVehicle;
  settings: SiteSettings;
}) {
  const heroFallback = selectPageHeroFallback(settings, vehicle.slug);
  const hero = assetUrl(vehicle.image ?? heroFallback?.image);
  const heroAlt = vehicle.image ? (vehicle.imageAlt ?? "") : (heroFallback?.imageAlt ?? vehicle.imageAlt ?? "");
  const gallery = (vehicle.gallery ?? []).map(assetUrl).filter((src): src is string => Boolean(src));
  const layouts = (vehicle.layoutImages ?? []).map(assetUrl).filter((src): src is string => Boolean(src));

  return (
    <article>
      <BreadcrumbJsonLd
        items={[
          { label: "Home", path: "/" },
          { label: "Fleet", path: "/fleet" },
          { label: vehicle.name, path: `/${vehicle.slug}` },
        ]}
      />

      <section className="relative isolate min-h-[390px] overflow-hidden bg-navy text-offwhite sm:min-h-[470px]">
        {hero && (
          <Image
            src={hero}
            alt={heroAlt}
            fill
            sizes="100vw"
            className="z-0 object-cover"
            priority
          />
        )}
        <div className="absolute inset-0 z-[1] bg-gradient-to-t from-navy/90 via-navy/45 to-navy/25" />
        <div className="relative z-10 mx-auto flex min-h-[390px] max-w-7xl flex-col justify-between px-4 py-8 sm:min-h-[470px] sm:px-6 sm:py-10">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-offwhite/80">
            <Link href="/" className="hover:text-white">Home</Link>
            <span>/</span>
            <Link href="/fleet" className="hover:text-white">Fleet</Link>
            <span>/</span>
            <span>{vehicle.name}</span>
          </nav>
          <Reveal className="max-w-3xl pb-4">
            <Eyebrow className="text-sky-300">{settings.fleetPage.eyebrow}</Eyebrow>
            <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl lg:text-6xl">{vehicle.name}</h1>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href={settings.fleetPage.charterCta.href}>
                {settings.fleetPage.charterCta.label}
                <Icon name="arrowRight" className="h-4 w-4" />
              </ButtonLink>
              <a href={settings.phone.href} className={buttonCls("ghostDark")}>
                <Icon name="phone" className="h-4 w-4" />
                {settings.phone.display}
              </a>
            </div>
            <dl className="mt-8 grid max-w-3xl gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/20 bg-navy/50 px-4 py-3 backdrop-blur-md">
                <dt className="text-xs font-semibold uppercase tracking-wide text-white/65">{settings.fleetPage.detailSeatsLabel}</dt>
                <dd className="mt-1 font-display text-xl font-bold text-white">{vehicle.seats}</dd>
              </div>
              <div className="rounded-2xl border border-white/20 bg-navy/50 px-4 py-3 backdrop-blur-md">
                <dt className="text-xs font-semibold uppercase tracking-wide text-white/65">{settings.fleetPage.detailFeaturesLabel}</dt>
                <dd className="mt-1 font-display text-xl font-bold text-white">{vehicle.features.length}</dd>
              </div>
              <div className="rounded-2xl border border-white/20 bg-navy/50 px-4 py-3 backdrop-blur-md">
                <dt className="text-xs font-semibold uppercase tracking-wide text-white/65">{settings.fleetPage.detailClassLabel}</dt>
                <dd className="mt-1 truncate font-display text-xl font-bold text-white">{vehicle.groupLabel}</dd>
              </div>
            </dl>
          </Reveal>
        </div>
      </section>

      <section className="relative overflow-hidden bg-offwhite">
        <div className="pointer-events-none absolute -left-24 top-10 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
          <Reveal className="grid overflow-hidden rounded-3xl border border-greyblue/20 bg-white shadow-xl shadow-navy/10 lg:grid-cols-[0.38fr_0.62fr]">
            <div className="flex flex-col justify-between bg-gradient-to-br from-accent to-navy p-8 text-white sm:p-10">
              <Icon name="bus" className="h-10 w-10 text-sky-200" />
              <div className="mt-16">
                <p className="font-display text-5xl font-bold">{vehicle.seats}</p>
                <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-white/70">{settings.fleetPage.detailSeatsLabel}</p>
              </div>
            </div>
            <div className="p-8 sm:p-10 lg:p-12">
              <Eyebrow>{vehicle.groupLabel}</Eyebrow>
              <h2 className="mt-3 font-display text-3xl font-bold text-navy sm:text-4xl">{settings.fleetPage.detailHeading}</h2>
              <p className="mt-5 text-base leading-7 text-navy/70 sm:text-lg">{vehicle.summary}</p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-navy text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-16">
          <Reveal className="text-center">
            <Eyebrow className="text-sky-300">{settings.fleetPage.facilitiesEyebrow}</Eyebrow>
            <h2 className="mt-3 font-display text-3xl font-bold text-white sm:text-4xl">{settings.fleetPage.facilitiesHeading}</h2>
          </Reveal>
          <Stagger className="mx-auto mt-8 grid max-w-4xl gap-3 sm:grid-cols-2" gap={0.05}>
            {vehicle.features.map((feature) => (
              <StaggerItem key={feature}>
                <div className="flex h-full items-center gap-3 rounded-xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sky-300/15 text-sky-300">
                    <Icon name={featureIcon(feature)} className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-medium text-white">{feature}</span>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {layouts.length > 0 && (
        <section className="bg-gradient-to-b from-white to-tint-soft">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
            <Reveal className="text-center">
              <Eyebrow>{settings.fleetPage.layoutEyebrow}</Eyebrow>
              <h2 className="mt-3 font-display text-3xl font-bold text-navy sm:text-4xl">{settings.fleetPage.layoutHeading}</h2>
            </Reveal>
            <div className={`mt-8 grid items-center gap-6 ${layouts.length > 1 ? "md:grid-cols-2" : ""}`}>
              {layouts.map((src, index) => (
                <Reveal key={src} delay={index * 0.06}>
                  <div className="relative mx-auto aspect-[16/9] w-full max-w-4xl overflow-hidden rounded-2xl border border-greyblue/20 bg-white shadow-lg shadow-navy/10">
                    <Image src={src} alt={`${vehicle.name} seating layout ${index + 1}`} fill sizes="(max-width: 768px) 100vw, 800px" className="object-contain" />
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {gallery.length > 0 && (
        <section className="bg-tint-soft">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
            <Reveal className="text-center">
              <Eyebrow>{settings.fleetPage.galleryEyebrow}</Eyebrow>
              <h2 className="mt-3 font-display text-3xl font-bold text-navy sm:text-4xl">{settings.fleetPage.galleryHeading}</h2>
            </Reveal>
            <Reveal className="mt-8">
              <ImageLightboxGallery
                images={gallery.map((src, index) => ({ src, alt: `${vehicle.name} gallery image ${index + 1}` }))}
              />
            </Reveal>
          </div>
        </section>
      )}

      <FleetExperience content={settings.fleetPage} image={gallery[0] ? vehicle.gallery?.[0] : vehicle.image} />
    </article>
  );
}
