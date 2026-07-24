import type { Metadata } from "next";
import Link from "next/link";
import { getBookingByReference } from "@/lib/stripe";
import { getStops, getSettings } from "@/lib/directus";
import { boardingPassFromBooking } from "@/lib/ticket";
import { BoardingPass } from "@/components/account/BoardingPass";
import { TicketActions } from "@/components/account/TicketActions";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = {
  title: "Booking confirmed",
  description: "Your NP Coaches Daily Express booking is confirmed.",
  robots: { index: false },
};

export default async function BookingSuccessPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  const booking = ref ? await getBookingByReference(ref) : null;
  const [stops, settings] = await Promise.all([getStops(), getSettings()]);
  const pass = booking ? await boardingPassFromBooking(booking, stops, settings.name) : null;

  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <div className="rounded-2xl border border-accent/30 bg-accent/5 p-6 text-navy sm:p-8">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-accent text-white">
          <Icon name="check" className="h-6 w-6" />
        </span>
        <h1 className="mt-4 font-display text-3xl font-bold">Thank you — your booking is confirmed</h1>
        <p className="mt-3 text-navy/70">
          We&apos;ve received your payment and a receipt has been emailed to you. Your ticket is below — download it or
          find it any time in{" "}
          <Link href="/account" className="font-semibold text-accent hover:underline">
            your account
          </Link>{" "}
          (sign in with the email you booked with).
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
        ref && (
          <p className="mt-8 text-sm">
            Booking reference: <span className="font-display text-lg font-bold text-navy">{ref}</span>
          </p>
        )
      )}

      <div className="mt-8 flex flex-wrap gap-4">
        <Link
          href="/account"
          className="rounded-xl bg-accent px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90"
        >
          Go to my account
        </Link>
        <Link
          href="/daily-express-service"
          className="rounded-xl border border-navy/15 px-6 py-3 font-semibold text-navy transition-colors hover:bg-navy/5"
        >
          Back to timetable
        </Link>
      </div>

      <p className="mt-6 text-center text-sm text-navy/60">Please arrive 15 minutes before departure.</p>
    </article>
  );
}
