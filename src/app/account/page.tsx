import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-store";
import { getCustomerBookings, getCustomerPasses } from "@/lib/account";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = {
  title: "My account",
  description: "Your NP Coaches tickets and lost-property claims.",
  robots: { index: false },
};

function gbp(pence: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: "bg-emerald-50 text-emerald-700",
    pending: "bg-amber-50 text-amber-700",
    failed: "bg-red-50 text-red-700",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${styles[status] ?? "bg-navy/5 text-navy/70"}`}>
      {status}
    </span>
  );
}

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/account/login");

  const [bookings, passes] = await Promise.all([
    getCustomerBookings(session.email),
    getCustomerPasses(session.email),
  ]);

  return (
    <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:py-20">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-navy">My account</h1>
          <p className="mt-1 text-sm text-navy/70">
            Signed in as <span className="font-semibold text-navy">{session.email}</span>
          </p>
        </div>
        <form action="/account/logout" method="post">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl border border-navy/15 bg-white px-4 py-2.5 text-sm font-semibold text-navy transition-colors hover:bg-navy/5"
          >
            <Icon name="logout" className="h-4 w-4" />
            Sign out
          </button>
        </form>
      </div>

      {/* Tickets */}
      <div className="mt-10">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold text-navy">
          <Icon name="ticket" className="h-5 w-5 text-accent" />
          My tickets
        </h2>
        {bookings.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-greyblue/40 bg-greyblue/5 p-8 text-center text-sm text-navy/70">
            No tickets yet.{" "}
            <Link href="/daily-express-service/book" className="font-semibold text-accent hover:underline">
              Book a Daily Express journey →
            </Link>
          </div>
        ) : (
          <ul className="mt-4 grid gap-3">
            {bookings.map((b) => (
              <li
                key={b.reference}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-greyblue/20 bg-white p-5 shadow-sm"
              >
                <div>
                  <p className="font-semibold text-navy">{b.route_label}</p>
                  <p className="mt-0.5 text-sm text-navy/70">
                    {b.trip_date ?? "—"} · {b.passengers} passenger{b.passengers > 1 ? "s" : ""} · {gbp(b.amount)}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-navy/70">{b.reference}</p>
                </div>
                <Link
                  href={`/account/ticket/${b.reference}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-accent/20 transition-all hover:bg-brand-hover hover:shadow-md"
                >
                  <Icon name="ticket" className="h-4 w-4" />
                  View ticket
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Lost & found */}
      <div className="mt-12">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold text-navy">
          <Icon name="luggage" className="h-5 w-5 text-accent" />
          Lost &amp; found claims
        </h2>
        {passes.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-greyblue/40 bg-greyblue/5 p-8 text-center text-sm text-navy/70">
            No claims.{" "}
            <Link href="/lost-property/claim" className="font-semibold text-accent hover:underline">
              Report a lost item →
            </Link>
          </div>
        ) : (
          <ul className="mt-4 grid gap-3">
            {passes.map((p) => (
              <li key={p.reference} className="rounded-2xl border border-greyblue/20 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold text-navy">{p.item_description}</p>
                  <StatusBadge status={p.status} />
                </div>
                <p className="mt-1 text-sm text-navy/70">
                  {p.travel_date ? `Travelled ${p.travel_date} · ` : ""}
                  {gbp(p.amount)}
                </p>
                <p className="mt-0.5 font-mono text-xs text-navy/70">{p.reference}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
