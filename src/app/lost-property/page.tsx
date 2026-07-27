import type { Metadata } from "next";
import Image from "next/image";
import { getPage, getSettings } from "@/lib/directus";
import { priceLostPropertyPass } from "@/lib/stripe";
import { PageHero } from "@/components/sections/PageHero";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/motion";
import { assetUrl } from "@/lib/directus";

export const metadata: Metadata = {
  title: "Lost & Found | NP Coaches",
  description:
    "Lost something on an NP Coaches service? Learn how our lost-and-found process works, then submit a secure claim online.",
  alternates: { canonical: "/lost-property" },
};

function formatGBP(pence: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}

const steps = [
  { icon: "route" as const, title: "Tell us about the journey", text: "Give us the date, approximate time, route and where you may have left the item." },
  { icon: "luggage" as const, title: "Describe what is missing", text: "A clear description, colour, brand and distinguishing marks help us identify it quickly." },
  { icon: "ticket" as const, title: "Submit your claim", text: "Buy a secure lost & found ticket online so our depot team can log and process the request." },
  { icon: "checkCircle" as const, title: "We will be in touch", text: "If the item is handed in, we contact you to arrange collection from our Iver depot." },
];

export default async function LostPropertyPage() {
  const [page, settings, priced] = await Promise.all([getPage("lost-property"), getSettings(), priceLostPropertyPass()]);
  const image = assetUrl(page?.image);

  return (
    <article>
      <PageHero
        eyebrow="Lost & found"
        title="Left something on board?"
        intro={page?.subtitle ?? "Start a lost-property claim online and our team will check whether your item has been handed in."}
        crumbs={[{ label: "Home", href: "/" }, { label: "Lost & Found" }]}
        ctas={[
          { label: "Report a lost item", href: "/lost-property/claim", primary: true, icon: "arrowRight" },
          { label: `Call ${settings.phone.display}`, href: settings.phone.href, icon: "phone" },
        ]}
      />

      <section className="bg-offwhite">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] lg:py-20">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">A simple, secure process</p>
            <h2 className="mt-3 max-w-xl font-display text-3xl font-bold text-navy sm:text-4xl">A clearer route back to your property</h2>
            <div className="prose mt-6 max-w-2xl" dangerouslySetInnerHTML={{ __html: page?.body ?? "" }} />
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/lost-property/claim" className="group">
                Start your claim
                <Icon name="arrowRight" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </ButtonLink>
              <a href={`mailto:${settings.email.general}`} className="inline-flex items-center justify-center rounded-xl border border-navy/15 bg-white px-6 py-3 font-semibold text-navy shadow-sm transition-colors hover:border-accent/40 hover:bg-navy hover:text-white">
                Email our team
              </a>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="overflow-hidden rounded-3xl border border-greyblue/20 bg-white shadow-md shadow-navy/5">
              {image ? (
                <div className="relative aspect-[16/9] bg-greyblue/15">
                  <Image src={image} alt="NP Coaches vehicle" fill sizes="(max-width: 1024px) 100vw, 480px" className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy/50 to-transparent" />
                </div>
              ) : null}
              <div className="p-6 sm:p-7">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">Lost & found ticket</p>
                <h2 className="mt-2 font-display text-2xl font-bold text-navy">{formatGBP(priced.net)} + VAT</h2>
                <p className="mt-2 text-sm text-navy/70">{formatGBP(priced.amount)} total. This covers the administration and storage work involved in checking and processing a reclaimed item.</p>
                <dl className="mt-6 space-y-3 border-t border-greyblue/15 pt-5 text-sm">
                  <div className="flex justify-between gap-4"><dt className="text-navy/70">Administration fee</dt><dd className="font-semibold text-navy">{formatGBP(priced.net)}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-navy/70">VAT ({priced.vatRate}%)</dt><dd className="font-semibold text-navy">{formatGBP(priced.vat)}</dd></div>
                  <div className="flex justify-between gap-4 border-t border-greyblue/15 pt-3"><dt className="font-semibold text-navy">Total</dt><dd className="font-display text-lg font-bold text-navy">{formatGBP(priced.amount)}</dd></div>
                </dl>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-tint-soft">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">What happens next</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-navy">Four steps, no guesswork</h2>
          </div>
          <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <li key={step.title} className="rounded-2xl border border-greyblue/20 bg-white p-5 shadow-sm shadow-navy/5">
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent"><Icon name={step.icon} className="h-5 w-5" /></span>
                  <span className="font-mono text-xs font-semibold text-navy/40">0{index + 1}</span>
                </div>
                <h3 className="mt-5 font-display text-lg font-semibold text-navy">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-navy/70">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-offwhite">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-16 sm:px-6 lg:grid-cols-3 lg:py-20">
          <div className="rounded-3xl bg-navy p-6 text-offwhite lg:col-span-2">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-400">Please note</p>
            <h2 className="mt-2 font-display text-2xl font-bold">Collection and retention</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-greyblue">Items should be collected from our depot within 7 days of travel to avoid additional storage charges. Lost property is held for a maximum of 14 days, then disposed of.</p>
          </div>
          <div className="rounded-3xl border border-greyblue/20 bg-white p-6 shadow-sm shadow-navy/5">
            <Icon name="mapPin" className="h-6 w-6 text-accent" />
            <h2 className="mt-4 font-display text-lg font-semibold text-navy">Collection point</h2>
            <p className="mt-2 text-sm leading-6 text-navy/70">{settings.address.line1}, {settings.address.line2}, {settings.address.city}, {settings.address.postcode}</p>
            <a href={settings.phone.href} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline"><Icon name="phone" className="h-4 w-4" /> {settings.phone.display}</a>
          </div>
        </div>
      </section>
    </article>
  );
}
