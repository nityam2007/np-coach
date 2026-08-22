import { assetUrl, type SiteSettings } from "@/lib/directus";
import { JsonLdScript } from "@/components/seo/JsonLd";

/** Site-wide Organization / LocalBusiness structured data. */
export function OrganizationJsonLd({ settings }: { settings: SiteSettings }) {
  const logo = assetUrl(settings.logo);
  const sameAs = settings.socialLinks.map((link) => link.href).filter(Boolean);
  const data = {
    "@context": "https://schema.org",
    "@type": ["Organization", "LocalBusiness"],
    "@id": `${settings.url}/#organization`,
    name: settings.name,
    legalName: settings.legalName,
    url: settings.url,
    logo: logo ?? undefined,
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
    sameAs: sameAs.length ? sameAs : undefined,
  };

  return <JsonLdScript data={data} />;
}
