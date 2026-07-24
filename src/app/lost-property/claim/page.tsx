import type { Metadata } from "next";
import Link from "next/link";
import { LostPropertyForm } from "@/components/forms/LostPropertyForm";
import { StripesBackdrop } from "@/components/ui/Backdrops";
import { getSettings } from "@/lib/directus";
import { priceLostPropertyPass } from "@/lib/stripe";

export const metadata: Metadata = {
  title: "Report Lost Property",
  description:
    "Report an item left on an NP Coaches service and pay the reclaim admin fee online. Tell us your travel details and a description of the item.",
  alternates: { canonical: "/lost-property/claim" },
};

const STEPS = [
  { title: "Tell us about your journey", text: "Date, time, route and where you were sitting if you remember." },
  { title: "Describe the item", text: "The more detail the better — brand, colour, contents, distinguishing marks." },
  { title: "Pay the admin fee", text: "Covers handling and storage. You'll get a Stripe receipt by email." },
  { title: "We check and confirm", text: "We search our lost-property log and contact you about collection from our Iver depot." },
];

export default async function LostPropertyClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string }>;
}) {
  const { cancelled } = await searchParams;
  const [settings, priced] = await Promise.all([getSettings(), priceLostPropertyPass()]);
  const fee = (priced.amount / 100).toFixed(2);

  return (
    <article>
      <section className="relative overflow-hidden bg-gradient-to-br from-navy via-navy to-brand-deep text-offwhite">
        <StripesBackdrop dark />
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <Link href="/lost-property" className="text-sm text-greyblue transition-colors hover:text-offwhite">
            ← Lost property
          </Link>
          <h1 className="mt-4 font-display text-4xl font-bold sm:text-5xl">Report a lost item</h1>
          <p className="mt-4 max-w-2xl text-greyblue">
            Tell us about your journey and the item, pay the £{fee} admin fee securely, and we&apos;ll check whether
            your item has been handed in.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LostPropertyForm fee={priced.amount} vatRate={priced.vatRate} cancelled={cancelled === "1"} />
        </div>

        <aside className="space-y-6 lg:pt-2">
          <div className="rounded-xl border border-greyblue/30 bg-white p-6">
            <h2 className="font-display text-lg font-semibold text-navy">How it works</h2>
            <ol className="mt-4 space-y-4">
              {STEPS.map((step, i) => (
                <li key={step.title} className="flex gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-navy">{step.title}</p>
                    <p className="mt-0.5 text-sm text-navy/70">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-xl bg-navy p-6 text-offwhite">
            <h2 className="font-display text-lg font-semibold">Good to know</h2>
            <ul className="mt-3 space-y-2 text-sm text-greyblue">
              <li>• Items are held for a maximum of <strong className="text-offwhite">14 days</strong>.</li>
              <li>• Collect within <strong className="text-offwhite">7 days</strong> to avoid extra storage costs.</li>
              <li>• Collection from our Iver depot: {settings.address.line1}, {settings.address.city} {settings.address.postcode}.</li>
            </ul>
            <p className="mt-4 text-sm">
              Prefer to talk?{" "}
              <a href={settings.phone.href} className="font-semibold text-offwhite underline">
                {settings.phone.display}
              </a>
            </p>
          </div>
        </aside>
      </section>
    </article>
  );
}
