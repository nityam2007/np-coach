import { assetUrl, type SiteSettings } from "@/lib/directus";
import type { ServiceCard } from "@/lib/site-config";
import { JsonLdScript } from "@/components/seo/JsonLd";
import { siteUrl } from "@/lib/site-url";

/** The one `@id` every page's JSON-LD uses to reference the business node below. */
export const organizationId = (publicUrl: string) => `${publicUrl}/#organization`;

/** Site-wide Organization / LocalBusiness + WebSite structured data. */
export function OrganizationJsonLd({ settings, services }: { settings: SiteSettings; services: ServiceCard[] }) {
  const publicUrl = siteUrl(settings.url);
  const logo = assetUrl(settings.logo);
  const image = assetUrl(settings.heroImage);
  const sameAs = settings.socialLinks.map((link) => link.href).filter(Boolean);
  // E.164 (+44…) from the tel: link; the display form keeps the local spacing for people.
  const telephone = settings.phone.href.replace(/^tel:/, "") || settings.phone.display;
  const offerCatalog = services.length ? {
    "@type": "OfferCatalog",
    name: "Coach transport services",
    itemListElement: services.map((service) => ({
      "@type": "Offer",
      url: new URL(service.href, publicUrl).toString(),
      itemOffered: { "@type": "Service", name: service.title, description: service.blurb },
    })),
  } : undefined;
  const data = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": organizationId(publicUrl),
    name: settings.name,
    legalName: settings.legalName,
    url: publicUrl,
    logo: logo ?? undefined,
    image: image ?? logo ?? undefined,
    description: settings.description,
    telephone,
    email: settings.email.general,
    foundingDate: String(settings.founded),
    identifier: {
      "@type": "PropertyValue",
      propertyID: "Companies House",
      value: settings.companyNumber,
      url: `https://find-and-update.company-information.service.gov.uk/company/${settings.companyNumber}`,
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: `${settings.address.line1}, ${settings.address.line2}`,
      addressLocality: settings.address.city,
      addressRegion: settings.address.county,
      postalCode: settings.address.postcode,
      addressCountry: "GB",
    },
    contactPoint: [{
      "@type": "ContactPoint",
      telephone,
      email: settings.email.general,
      contactType: "customer service",
      areaServed: "GB",
      availableLanguage: "English",
    }],
    areaServed: { "@type": "Country", name: "United Kingdom" },
    currenciesAccepted: "GBP",
    paymentAccepted: "Cash, Credit Card, Debit Card",
    priceRange: "££",
    hasOfferCatalog: offerCatalog,
    sameAs: sameAs.length ? sameAs : undefined,
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${publicUrl}/#website`,
    url: publicUrl,
    name: settings.name,
    inLanguage: "en-GB",
    publisher: { "@id": organizationId(publicUrl) },
  };

  return (
    <>
      <JsonLdScript data={data} />
      <JsonLdScript data={website} />
    </>
  );
}
