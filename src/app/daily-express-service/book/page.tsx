import type { Metadata } from "next";
import Link from "next/link";
import { BookingForm, type BookingStopOption } from "@/components/forms/BookingForm";
import { StripesBackdrop } from "@/components/ui/Backdrops";
import { Icon } from "@/components/ui/Icon";
import { getStops, getSettings } from "@/lib/directus";
import { computeGross } from "@/lib/stripe";

export const metadata: Metadata = {
  title: "Book the Daily Express",
  alternates: { canonical: "/daily-express-service/book" },
  description:
    "Book your seat on the NP Coaches Daily Express service between London and the Midlands. Choose your stops, date and passengers and pay securely online.",
};

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; date?: string; pax?: string; trip?: string; cancelled?: string }>;
}) {
  const { from, to, date, pax, trip, cancelled } = await searchParams;
  const [stops, settings] = await Promise.all([getStops(), getSettings()]);
  const options: BookingStopOption[] = stops.map((s) => ({ code: s.code, name: s.name }));

  // Fares are VAT-inclusive, computed from the CMS pricing (same logic the server uses).
  const fareSingle = computeGross(settings.pricing.dailyExpressSingle, settings.pricing.dailyExpressVat).gross;
  const fareReturn = computeGross(settings.pricing.dailyExpressReturn, settings.pricing.dailyExpressVat).gross;

  return (
    <article>
      <section className="relative overflow-hidden bg-gradient-to-br from-navy via-navy to-brand-deep text-offwhite">
        <StripesBackdrop dark />
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <Link href="/daily-express-service" className="text-sm text-greyblue transition-colors hover:text-offwhite">
            ← Daily Express service
          </Link>
          <h1 className="mt-4 font-display text-4xl font-bold sm:text-5xl">Book your seat</h1>
          <p className="mt-4 max-w-2xl text-greyblue">
            Choose where you&apos;re travelling from and to, your date and number of passengers, then pay securely
            online.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        {/* Trust rail at the decision point — reassurance where the money changes hands. */}
        <ul className="mb-8 grid gap-3 rounded-2xl border border-greyblue/20 bg-tint-soft px-5 py-4 text-sm text-navy/80 sm:grid-cols-3">
          <li className="flex items-center gap-2">
            <Icon name="shield" className="h-4 w-4 shrink-0 text-accent" />
            Secure payment by Stripe
          </li>
          <li className="flex items-center gap-2">
            <Icon name="checkCircle" className="h-4 w-4 shrink-0 text-accent" />
            E-ticket sent to your email
          </li>
          <li className="flex items-center gap-2">
            <Icon name="phone" className="h-4 w-4 shrink-0 text-accent" />
            <a href={settings.phone.href} className="hover:text-navy hover:underline">
              Questions? {settings.phone.display}
            </a>
          </li>
        </ul>

        <BookingForm
          stops={options}
          fareSingle={fareSingle}
          fareReturn={fareReturn}
          defaultFrom={from}
          defaultTo={to}
          defaultDate={date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined}
          defaultPassengers={pax ? Number(pax) || undefined : undefined}
          defaultTripType={trip === "return" ? "return" : undefined}
          cancelled={cancelled === "1"}
        />
      </section>
    </article>
  );
}
