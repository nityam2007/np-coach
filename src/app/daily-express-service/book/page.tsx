import type { Metadata } from "next";
import { BookingForm, type BookingRouteOption, type BookingStopOption } from "@/components/forms/BookingForm";
import { PageHero } from "@/components/sections/PageHero";
import { Icon } from "@/components/ui/Icon";
import { getRoutes, getStops, getSettings, selectPageHeroFallback } from "@/lib/directus";
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
  searchParams: Promise<{ from?: string; to?: string; date?: string; returnDate?: string; pax?: string; trip?: string; cancelled?: string }>;
}) {
  const { from, to, date, returnDate, pax, trip, cancelled } = await searchParams;
  const [stops, routes, settings] = await Promise.all([getStops(), getRoutes(), getSettings()]);
  const options: BookingStopOption[] = stops.map((s) => ({ code: s.code, name: s.name }));

  const routeOptions: BookingRouteOption[] = routes.map((route) => ({
    stops: route.stops.flatMap((stop) => stop.code ? [stop.code] : []),
    fareSingle: computeGross(route.priceSingle, settings.pricing.dailyExpressVat).gross,
    fareReturn: computeGross(route.priceReturn, settings.pricing.dailyExpressVat).gross,
    capacity: route.capacity ?? 0,
  }));
  const heroFallback = selectPageHeroFallback(settings, "/daily-express-service/book");

  return (
    <article>
      <PageHero
        eyebrow="Daily Express"
        title="Book your seat"
        intro="Choose where you're travelling from and to, your date and number of passengers, then pay securely online."
        crumbs={[{ label: "Home", href: "/" }, { label: "Daily Express", href: "/daily-express-service" }, { label: "Book" }]}
        image={heroFallback?.image}
        imageAlt={heroFallback?.imageAlt}
        useFallback={false}
      />

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
          routes={routeOptions}
          defaultFrom={from}
          defaultTo={to}
          defaultDate={date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined}
          defaultPassengers={pax ? Number(pax) || undefined : undefined}
          defaultTripType={trip === "return" ? "return" : undefined}
          defaultReturnDate={returnDate && /^\d{4}-\d{2}-\d{2}$/.test(returnDate) ? returnDate : undefined}
          cancelled={cancelled === "1"}
          bookingsEnabled={process.env.NODE_ENV !== "production" || process.env.DAILY_EXPRESS_BOOKINGS_ENABLED === "true"}
        />
      </section>
    </article>
  );
}
