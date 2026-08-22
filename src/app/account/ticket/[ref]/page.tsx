import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth-store";
import { getBookingByReference } from "@/lib/stripe";
import { getStops, getSettings } from "@/lib/directus";
import { boardingPassFromBooking } from "@/lib/ticket";
import { BoardingPass } from "@/components/account/BoardingPass";
import { TicketActions } from "@/components/account/TicketActions";
import { Icon } from "@/components/ui/Icon";
import { siteUrl } from "@/lib/site-url";

export const metadata: Metadata = { title: "Your ticket", robots: { index: false } };

export default async function TicketPage({ params }: { params: Promise<{ ref: string }> }) {
  const session = await getSession();
  if (!session) redirect("/account/login");

  const { ref } = await params;
  const booking = await getBookingByReference(ref);

  // Authorisation: the ticket must have committed paid inventory AND be owned by the signed-in customer.
  // notFound() (not a message) so we never reveal whether a reference exists.
  if (!booking || booking.status !== "paid" || booking.inventory_status !== "committed" || booking.email.trim().toLowerCase() !== session.email) {
    notFound();
  }

  const [stops, settings] = await Promise.all([getStops(), getSettings()]);
  const pass = await boardingPassFromBooking(booking, stops, settings.name, siteUrl(settings.url));

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-20">
      <Link href="/account" className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
        <Icon name="arrowLeft" className="h-4 w-4" />
        Back to account
      </Link>

      <h1 className="mt-4 font-display text-2xl font-bold text-navy">Your ticket</h1>
      <p className="mt-1 text-sm text-navy/70">Show this at boarding — or download it below.</p>

      <div className="mt-6">
        <BoardingPass data={pass} domId="boarding-pass" />
      </div>

      <div className="mt-6">
        <TicketActions targetId="boarding-pass" reference={booking.reference} />
      </div>

      <p className="mt-6 text-sm text-navy/70">
        Please arrive 15 minutes before departure. Your booking reference is{" "}
        <span className="font-mono font-semibold text-navy/70">{booking.reference}</span>.
      </p>
    </section>
  );
}
