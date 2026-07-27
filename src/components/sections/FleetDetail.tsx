import Image from "next/image";
import Link from "next/link";
import type { FleetVehicle } from "@/lib/site-config";
import type { SiteSettings } from "@/lib/directus";
import { assetUrl } from "@/lib/directus";
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
  const hero = assetUrl(vehicle.image);
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
            alt={`${vehicle.name} coach`}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/45 to-navy/25" />
        <div className="relative mx-auto flex min-h-[390px] max-w-7xl flex-col justify-between px-4 py-8 sm:min-h-[470px] sm:px-6 sm:py-10">
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
          </Reveal>
        </div>
      </section>

      <section className="relative overflow-hidden bg-white">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:py-20">
          <Reveal>
            <Eyebrow>{vehicle.seats} seats</Eyebrow>
            <h2 className="mt-3 font-display text-3xl font-bold text-navy sm:text-4xl">{settings.fleetPage.detailHeading}</h2>
            <p className="mt-2 font-display text-xl font-semibold text-accent">{vehicle.groupLabel}</p>
            <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-navy/70 sm:text-lg">{vehicle.summary}</p>
          </Reveal>
        </div>
      </section>

      <section className="bg-greyblue/20">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-16">
          <Reveal className="text-center">
            <Eyebrow>{settings.fleetPage.facilitiesEyebrow}</Eyebrow>
            <h2 className="mt-3 font-display text-3xl font-bold text-navy sm:text-4xl">{settings.fleetPage.facilitiesHeading}</h2>
          </Reveal>
          <Stagger className="mx-auto mt-8 grid max-w-4xl gap-3 sm:grid-cols-2" gap={0.05}>
            {vehicle.features.map((feature) => (
              <StaggerItem key={feature}>
                <div className="flex h-full items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
                    <Icon name={featureIcon(feature)} className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-medium text-navy">{feature}</span>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {layouts.length > 0 && (
        <section className="bg-white">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
            <Reveal className="text-center">
              <Eyebrow>{settings.fleetPage.layoutEyebrow}</Eyebrow>
              <h2 className="mt-3 font-display text-3xl font-bold text-navy sm:text-4xl">{settings.fleetPage.layoutHeading}</h2>
            </Reveal>
            <div className={`mt-8 grid items-center gap-6 ${layouts.length > 1 ? "md:grid-cols-2" : ""}`}>
              {layouts.map((src, index) => (
                <Reveal key={src} delay={index * 0.06}>
                  <div className="relative mx-auto aspect-[16/9] w-full max-w-4xl overflow-hidden rounded-2xl bg-white">
                    <Image src={src} alt={`${vehicle.name} seating layout ${index + 1}`} fill sizes="(max-width: 768px) 100vw, 800px" className="object-contain" />
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {gallery.length > 0 && (
        <section className="bg-greyblue/15">
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
