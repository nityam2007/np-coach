import Link from "next/link";
import { getSettings } from "@/lib/directus";
import { PageHero } from "@/components/sections/PageHero";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { buildMetadata } from "@/lib/seo";
import { QuoteForm } from "@/components/forms/QuoteForm";

export const metadata = buildMetadata({
  title: "Get a Quote",
  description:
    "Request a free, no-obligation coach hire quote from NP Coaches. Tell us your journey, dates and group size and we'll get back to you quickly.",
  path: "/get-a-quote",
});

export default async function GetAQuotePage() {
  const settings = await getSettings();

  return (
    <article>
      <BreadcrumbJsonLd items={[{ label: "Home", path: "/" }, { label: "Get a Quote", path: "/get-a-quote" }]} />

      <PageHero
        eyebrow="Free & no obligation"
        title="Get a Quote"
        intro="Got a trip that needs coach transport? Request a free, no-obligation quote below — or call us any time."
        crumbs={[{ label: "Home", href: "/" }, { label: "Get a Quote" }]}
        ctas={[
          { label: `Call ${settings.phone.display}`, href: settings.phone.href, icon: "phone", primary: true },
          { label: "Message us", href: "/contact-us", icon: "arrowRight" },
        ]}
      />

      <section className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="font-display text-2xl font-bold text-navy">Quick quote</h2>

          <div className="mt-6 rounded-2xl border border-greyblue/30 bg-white p-5 sm:p-7"><QuoteForm /></div>
        </div>

        <aside className="rounded-xl bg-greyblue/10 p-6 text-sm text-navy/80 lg:self-start">
          <h2 className="font-display text-lg font-bold text-navy">Need a consultation?</h2>
          <p className="mt-2">
            Prefer to talk it through? Our team is happy to help plan your journey and recommend the right coach.
          </p>
          <Link href="/contact-us" className="mt-4 inline-block font-semibold text-accent hover:underline">
            Contact us →
          </Link>
        </aside>
      </section>
    </article>
  );
}
