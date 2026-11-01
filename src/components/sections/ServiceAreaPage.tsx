import Link from "next/link";
import type { FleetVehicle, ServiceArea } from "@/lib/site-config";
import type { SiteSettings } from "@/lib/directus";
import { PageHero } from "@/components/sections/PageHero";
import { FleetCard } from "@/components/sections/FleetCard";
import { FaqAccordion } from "@/components/sections/FaqAccordion";
import { BreadcrumbJsonLd, JsonLdScript } from "@/components/seo/JsonLd";
import { organizationId } from "@/components/seo/OrganizationJsonLd";
import { CmsHtml } from "@/components/ui/CmsHtml";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Reveal } from "@/components/ui/motion";
import { siteUrl } from "@/lib/site-url";

/** Local "coach hire in <town>" landing page: CMS copy, fleet, FAQs and links to the other areas. */
export function ServiceAreaPage({
  area,
  otherAreas,
  fleet,
  settings,
}: {
  area: ServiceArea;
  otherAreas: ServiceArea[];
  fleet: FleetVehicle[];
  settings: SiteSettings;
}) {
  const publicUrl = siteUrl(settings.url);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Coach hire",
    name: area.title,
    description: area.seoDescription,
    url: `${publicUrl}/${area.slug}`,
    areaServed: { "@type": "City", name: area.town },
    provider: { "@id": organizationId(publicUrl) },
  };

  return (
    <article>
      <JsonLdScript data={jsonLd} />
      <BreadcrumbJsonLd items={[{ label: "Home", path: "/" }, { label: area.title, path: `/${area.slug}` }]} />
      <PageHero
        eyebrow={`Coach hire · ${area.town}`}
        title={area.title}
        intro={area.summary}
        crumbs={[{ label: "Home", href: "/" }, { label: area.title }]}
        image={area.image}
        imageAlt={area.imageAlt}
        fallbackKey={area.slug}
        ctas={[
          { label: "Get a quote", href: "/get-a-quote", primary: true },
          { label: `Call ${settings.phone.display}`, href: settings.phone.href, icon: "phone" },
        ]}
      />

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <Reveal>
          <CmsHtml className="prose mx-auto max-w-3xl" html={area.body} />
        </Reveal>
      </section>

      {fleet.length > 0 && (
        <section className="bg-tint-soft">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
            <Reveal>
              <Eyebrow>Our fleet</Eyebrow>
              <h2 className="mt-3 font-display text-3xl font-bold text-navy sm:text-4xl">Coaches for {area.town} groups</h2>
            </Reveal>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {fleet.map((vehicle) => <FleetCard key={vehicle.slug} vehicle={vehicle} />)}
            </div>
          </div>
        </section>
      )}

      {area.faqs.length > 0 && <FaqAccordion faqs={area.faqs} />}

      {otherAreas.length > 0 && (
        <nav aria-label="Other areas we cover" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:pb-20">
          <h2 className="font-display text-xl font-bold text-navy">Other areas we cover</h2>
          <ul className="mt-4 flex flex-wrap gap-3">
            {otherAreas.map((other) => (
              <li key={other.slug}>
                <Link href={`/${other.slug}`} className="inline-flex min-h-11 items-center rounded-full border border-greyblue/40 bg-white px-4 text-sm font-semibold text-navy transition-colors hover:border-accent hover:text-accent">
                  Coach hire {other.town}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </article>
  );
}
