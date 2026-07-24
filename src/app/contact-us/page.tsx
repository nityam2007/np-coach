import { ContactForm } from "@/components/forms/ContactForm";
import { getSettings } from "@/lib/directus";
import { PageHero } from "@/components/sections/PageHero";
import { BreadcrumbJsonLd, ContactPageJsonLd } from "@/components/seo/JsonLd";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Contact Us",
  description:
    "Contact NP Coaches in Iver, West London. Call 0208 843 1000 or send us a message about coach hire, the Daily Express service and home-to-school transport.",
  path: "/contact-us",
});

export default async function ContactPage() {
  const settings = await getSettings();
  const { address } = settings;

  return (
    <article>
      <BreadcrumbJsonLd items={[{ label: "Home", path: "/" }, { label: "Contact Us", path: "/contact-us" }]} />
      <ContactPageJsonLd
        name={settings.name}
        telephone={settings.phone.display}
        email={settings.email.general}
        address={address}
      />

      <PageHero
        eyebrow="Get in touch"
        title="Contact Us"
        intro="Talk to our team about coach hire, scheduled services or school transport — we aim to reply within 24 hours."
        crumbs={[{ label: "Home", href: "/" }, { label: "Contact Us" }]}
      />

      <section className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-2xl font-bold text-navy">Send us a message</h2>
          <div className="mt-6">
            <ContactForm />
          </div>
        </div>

        <div className="lg:pl-8">
          <h2 className="font-display text-2xl font-bold text-navy">Get in touch</h2>
          <dl className="mt-6 space-y-4 text-sm text-navy/80">
            <div>
              <dt className="font-semibold text-navy">Phone</dt>
              <dd>
                <a href={settings.phone.href} className="text-accent hover:underline">
                  {settings.phone.display}
                </a>{" "}
                · {settings.phone.hours}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-navy">General enquiries</dt>
              <dd>
                <a href={`mailto:${settings.email.general}`} className="text-accent hover:underline">
                  {settings.email.general}
                </a>
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-navy">Bookings</dt>
              <dd>
                <a href={`mailto:${settings.email.bookings}`} className="text-accent hover:underline">
                  {settings.email.bookings}
                </a>
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-navy">Depot</dt>
              <dd>
                {address.line1}, {address.line2}, {address.city}, {address.county} {address.postcode}
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </article>
  );
}
