import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { getSettings } from "@/lib/directus";

export default async function ContactLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  const address = `${settings.address.line1}, ${settings.address.line2}, ${settings.address.city}, ${settings.address.postcode}`;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  return (
    <>
      {children}
      <section className="bg-tint-soft">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">Choose the quickest route</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-navy">We are here to help you travel well</h2>
            <p className="mt-3 text-navy/70">Whether you are planning a coach hire, asking about a Daily Express journey or need help with school transport, the right team is only a call or email away.</p>
          </div>
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            <a href={settings.phone.href} className="group rounded-2xl border border-greyblue/20 bg-white p-6 shadow-sm shadow-navy/5 transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-navy/10">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent"><Icon name="phone" className="h-5 w-5" /></span>
              <h3 className="mt-5 font-display text-xl font-semibold text-navy">Call the office</h3>
              <p className="mt-2 text-sm leading-6 text-navy/70">For a quick question or help with an existing journey, call during office hours.</p>
              <p className="mt-5 font-semibold text-accent group-hover:underline">{settings.phone.display}</p>
            </a>
            <a href={`mailto:${settings.email.bookings}`} className="group rounded-2xl border border-greyblue/20 bg-white p-6 shadow-sm shadow-navy/5 transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-navy/10">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent"><Icon name="ticket" className="h-5 w-5" /></span>
              <h3 className="mt-5 font-display text-xl font-semibold text-navy">Booking support</h3>
              <p className="mt-2 text-sm leading-6 text-navy/70">Need help with an itinerary, a passenger booking or a quote already in progress?</p>
              <p className="mt-5 break-all font-semibold text-accent group-hover:underline">{settings.email.bookings}</p>
            </a>
            <a href={mapUrl} target="_blank" rel="noreferrer" className="group rounded-2xl border border-greyblue/20 bg-white p-6 shadow-sm shadow-navy/5 transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-navy/10">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent"><Icon name="mapPin" className="h-5 w-5" /></span>
              <h3 className="mt-5 font-display text-xl font-semibold text-navy">Find our depot</h3>
              <p className="mt-2 text-sm leading-6 text-navy/70">Lost-property collections and other pre-arranged visits take place at our Iver depot.</p>
              <p className="mt-5 font-semibold text-accent group-hover:underline">Open directions →</p>
            </a>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-navy px-6 py-6 text-offwhite sm:px-8">
            <div><p className="font-display text-xl font-bold">Planning a private coach journey?</p><p className="mt-1 text-sm text-greyblue">Share the details and our team will prepare a tailored quote.</p></div>
            <ButtonLink href="/get-a-quote" variant="inverse">Get a quote</ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
