import Link from "next/link";
import { getSettings } from "@/lib/directus";
import { Icon } from "@/components/ui/Icon";
import { ButtonLink, buttonCls } from "@/components/ui/Button";
import { PageHero } from "@/components/sections/PageHero";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { buildMetadata } from "@/lib/seo";

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

          {/*
            The quote form is provided by an external quoting service as an embedded
            widget. Paste the provider's embed snippet (an <iframe> / <script> block)
            in place of this placeholder when it's supplied.
          */}
          <div className="mt-6 grid place-items-center rounded-2xl border border-dashed border-greyblue/40 bg-greyblue/5 px-6 py-16 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-accent/10 text-accent">
              <Icon name="tag" className="h-6 w-6" />
            </span>
            <h3 className="mt-4 font-display text-lg font-semibold text-navy">Our quote form is on its way</h3>
            <p className="mt-2 max-w-md text-sm text-navy/70">
              We&apos;re moving to a new online quoting system. In the meantime, call us or drop us a message and
              we&apos;ll get you a price the same day.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <a href={settings.phone.href} className={buttonCls("primary", "sm")}>
                <Icon name="phone" className="h-4 w-4" />
                Call {settings.phone.display}
              </a>
              <ButtonLink href="/contact-us" variant="secondary" size="sm">
                Message us
                <Icon name="arrowRight" className="h-4 w-4" />
              </ButtonLink>
            </div>
          </div>
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
