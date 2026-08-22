import type { Metadata } from "next";
import { confirmCheckoutSession, getBookingByReference, getPaidBookingByCheckoutSession } from "@/lib/stripe";
import { getStops, getSettings } from "@/lib/directus";
import { boardingPassFromBooking } from "@/lib/ticket";
import { BoardingPass } from "@/components/account/BoardingPass";
import { TicketActions } from "@/components/account/TicketActions";
import { Icon } from "@/components/ui/Icon";
import { ButtonLink } from "@/components/ui/Button";
import { siteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Booking confirmed",
  description: "Your NP Coaches Daily Express booking is confirmed.",
  robots: { index: false },
};

export default async function BookingSuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  const reference = session_id ? await confirmCheckoutSession(session_id, "booking") : null;
  const booking = reference
    ? await getBookingByReference(reference)
    : session_id
      ? await getPaidBookingByCheckoutSession(session_id)
      : null;
  const [stops, settings] = await Promise.all([getStops(), getSettings()]);
  const emailSent = booking?.confirmation_email_status === "sent";
  const pass = booking?.status === "paid" && booking.inventory_status === "committed"
    ? await boardingPassFromBooking(booking, stops, settings.name, siteUrl(settings.url))
    : null;

  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <div className="rounded-2xl border border-accent/30 bg-accent/5 p-6 text-navy sm:p-8">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-accent text-white">
          <Icon name="check" className="h-6 w-6" />
        </span>
        <h1 className="mt-4 font-display text-3xl font-bold">{pass ? "Thank you — your booking is confirmed" : "We’re confirming your payment"}</h1>
        <p className="mt-3 text-navy/70">
          {pass
            ? emailSent
              ? "Payment verified. We have emailed your NP Coaches confirmation and your ticket is below."
              : "Payment verified. Your ticket is below; you can also access it from your account while email delivery retries."
            : "Your payment is being confirmed securely with Stripe. No ticket is issued until that check succeeds."}
        </p>
      </div>

      {pass && booking ? (
        <>
          <div className="mt-8">
            <BoardingPass data={pass} domId="boarding-pass" />
          </div>
          <div className="mt-6">
            <TicketActions targetId="boarding-pass" reference={booking.reference} />
          </div>
        </>
      ) : (
        !pass && (
          <p className="mt-8 text-sm">
            Please refresh this page in a moment, or check your email for the Stripe receipt.
          </p>
        )
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href="/account">Go to my account</ButtonLink>
        <ButtonLink href="/daily-express-service/book" variant="secondary">
          Book another journey
        </ButtonLink>
        <ButtonLink href="/daily-express-service" variant="secondary">
          View timetable
        </ButtonLink>
      </div>

      <p className="mt-6 text-center text-sm text-navy/70">Please arrive 15 minutes before departure.</p>
    </article>
  );
}
