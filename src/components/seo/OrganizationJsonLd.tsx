import { assetUrl, type SiteSettings } from "@/lib/directus";
import type { ServiceCard } from "@/lib/site-config";
import { JsonLdScript } from "@/components/seo/JsonLd";

/** Site-wide Organization / LocalBusiness structured data. */
export function OrganizationJsonLd({ settings, services }: { settings: SiteSettings; services: ServiceCard[] }) {
  const logo = assetUrl(settings.logo);
  const image = assetUrl(settings.heroImage);
  const sameAs = settings.socialLinks.map((link) => link.href).filter(Boolean);
  const offerCatalog = services.length ? {
    "@type": "OfferCatalog",
    name: "Coach transport services",
    itemListElement: services.map((service) => ({
      "@type": "Offer",
      url: new URL(service.href, settings.url).toString(),
      itemOffered: { "@type": "Service", name: service.title, description: service.blurb },
    })),
  } : undefined;
  const data = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${settings.url}/#organization`,
    name: settings.name,
    alternateName: "NP Coaches",
    legalName: settings.legalName,
    url: settings.url,
    logo: logo ?? undefined,
    image: image ?? logo ?? undefined,
    description: settings.description,
    telephone: settings.phone.display,
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
      telephone: settings.phone.display,
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

  return <JsonLdScript data={data} />;
}
