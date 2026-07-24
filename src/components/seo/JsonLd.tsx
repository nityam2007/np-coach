import { siteConfig } from "@/lib/site-config";

/** Inline a JSON-LD <script>. */
function Ld({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

/** BreadcrumbList — pass the trail (label + path). Absolute-URLs each item. */
export function BreadcrumbJsonLd({ items }: { items: { label: string; path: string }[] }) {
  return (
    <Ld
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((it, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: it.label,
          item: `${siteConfig.url}${it.path}`,
        })),
      }}
    />
  );
}

/** ItemList for a listing page (fleet, tours, blog) — names + links, in order. */
export function ItemListJsonLd({ name, items }: { name: string; items: { name: string; path: string }[] }) {
  return (
    <Ld
      data={{
        "@context": "https://schema.org",
        "@type": "ItemList",
        name,
        itemListElement: items.map((it, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: it.name,
          url: `${siteConfig.url}${it.path}`,
        })),
      }}
    />
  );
}

/** ContactPage / LocalBusiness for the contact page (address + phone from settings). */
export function ContactPageJsonLd({
  name,
  telephone,
  email,
  address,
}: {
  name: string;
  telephone: string;
  email: string;
  address: { line1: string; line2: string; city: string; county: string; postcode: string };
}) {
  return (
    <Ld
      data={{
        "@context": "https://schema.org",
        "@type": "ContactPage",
        about: {
          "@type": "LocalBusiness",
          name,
          telephone,
          email,
          address: {
            "@type": "PostalAddress",
            streetAddress: `${address.line1}, ${address.line2}`,
            addressLocality: address.city,
            addressRegion: address.county,
            postalCode: address.postcode,
            addressCountry: "GB",
          },
        },
      }}
    />
  );
}

/** FAQPage — the structured data the home-to-school page's comment promised but never emitted. */
export function FaqJsonLd({ faqs }: { faqs: { question: string; answer: string }[] }) {
  return (
    <Ld
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      }}
    />
  );
}
