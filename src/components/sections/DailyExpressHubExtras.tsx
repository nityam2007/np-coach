"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

function formatGBP(pence: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}

const bookingSteps = [
  { icon: "route" as const, title: "Choose your stops", text: "Travel between any two stops on our London-to-Midlands corridor." },
  { icon: "calendar" as const, title: "Pick your travel date", text: "Online tickets must be booked at least one hour before departure." },
  { icon: "lock" as const, title: "Pay securely online", text: "Stripe processes your payment and sends a receipt to your email." },
  { icon: "checkCircle" as const, title: "Arrive ready to travel", text: "Please be at your collection point at least 15 minutes before departure." },
];

/** Extra hub-only content is rendered by the Daily Express layout, leaving the checkout route focused. */
export function DailyExpressHubExtras({
  singleFare,
  returnFare,
  phone,
}: {
  singleFare: number;
  returnFare: number;
  phone: { display: string; href: string };
}) {
  const segment = useSelectedLayoutSegment();
  if (segment !== null) return null;

  return (
    <>
      <section className="bg-tint-soft">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)] lg:py-20">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">Daily travel, made simple</p>
            <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold text-navy sm:text-4xl">London, the Midlands and Leicester — one easy booking</h2>
            <p className="mt-4 max-w-2xl text-navy/70">Choose the stops that suit your journey, select your date and receive your ticket details by email. Our scheduled service connects Southall and Slough with Coventry, Birmingham, Wolverhampton and Leicester.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/daily-express-service/book" className="group">Find a ticket <Icon name="arrowRight" className="h-4 w-4 transition-transform group-hover:translate-x-1" /></ButtonLink>
              <ButtonLink href="/timetable" variant="secondary">View full timetable</ButtonLink>
            </div>
          </div>
          <aside className="rounded-3xl bg-navy p-6 text-offwhite shadow-lg shadow-navy/10 sm:p-7">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-400">From the CMS price list</p>
            <h2 className="mt-3 font-display text-2xl font-bold">Straightforward fares</h2>
            <dl className="mt-6 divide-y divide-white/10">
              <div className="flex items-baseline justify-between gap-4 py-4"><dt className="text-greyblue">Single ticket</dt><dd className="font-display text-2xl font-bold">{formatGBP(singleFare)}</dd></div>
              <div className="flex items-baseline justify-between gap-4 py-4"><dt className="text-greyblue">Return ticket</dt><dd className="font-display text-2xl font-bold">{formatGBP(returnFare)}</dd></div>
            </dl>
            <p className="mt-4 text-sm leading-6 text-greyblue">Prices are per passenger and calculated securely when you book. Child and group concessions are not available on this service.</p>
          </aside>
        </div>
      </section>

      <section className="bg-offwhite">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl"><p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">Ready when you are</p><h2 className="mt-3 font-display text-3xl font-bold text-navy">Book your seat in four quick steps</h2></div>
            <a href={phone.href} className="text-sm font-semibold text-accent hover:underline">Questions? Call {phone.display}</a>
          </div>
          <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {bookingSteps.map((step, index) => (
              <li key={step.title} className="rounded-2xl border border-greyblue/20 bg-white p-5 shadow-sm shadow-navy/5">
                <div className="flex items-center justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent"><Icon name={step.icon} className="h-5 w-5" /></span><span className="font-mono text-xs font-semibold text-navy/40">0{index + 1}</span></div>
                <h3 className="mt-5 font-display text-lg font-semibold text-navy">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-navy/70">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
