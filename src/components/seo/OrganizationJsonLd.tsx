import type { SiteSettings } from "@/lib/directus";

/** Site-wide Organization / LocalBusiness structured data. */
export function OrganizationJsonLd({ settings }: { settings: SiteSettings }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: settings.name,
    legalName: settings.legalName,
    url: settings.url,
    telephone: settings.phone.display,
    email: settings.email.general,
    foundingDate: String(settings.founded),
    address: {
      "@type": "PostalAddress",
      streetAddress: `${settings.address.line1}, ${settings.address.line2}`,
      addressLocality: settings.address.city,
      addressRegion: settings.address.county,
      postalCode: settings.address.postcode,
      addressCountry: "GB",
    },
    areaServed: "United Kingdom",
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
