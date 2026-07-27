import type { Metadata } from "next";
import { confirmCheckoutSession, getPassPurchaseByReference } from "@/lib/stripe";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Lost property request received",
  description: "Your NP Coaches lost property reclaim request has been received.",
  robots: { index: false },
};

function formatGBP(pence: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}

export default async function PassSuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  const reference = session_id ? await confirmCheckoutSession(session_id, "pass") : null;
  const pass = reference ? await getPassPurchaseByReference(reference) : null;

  return (
    <article className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <div className="rounded-xl border border-accent/40 bg-accent/5 p-8 text-navy">
        <h1 className="font-display text-3xl font-bold">{pass?.status === "paid" ? "Thank you — your request is in" : "We’re confirming your payment"}</h1>
        <p className="mt-3 text-navy/70">
          {pass?.status === "paid" ? "Stripe has verified your payment and emailed your receipt. Our team will check whether your item has been handed in and contact you." : "Your payment is being confirmed securely with Stripe. Your request is not sent to the team until that check succeeds."}
        </p>

        {reference && pass?.status === "paid" && (
          <p className="mt-6 text-sm">
            Reference: <span className="font-display text-lg font-bold text-navy">{reference}</span>
          </p>
        )}

        {pass?.status === "paid" && (
          <dl className="mt-6 grid gap-2 text-sm text-navy/80">
            <div className="flex justify-between gap-4 border-b border-greyblue/20 py-1">
              <dt className="font-semibold text-navy">Item</dt>
              <dd className="text-right">{pass.item_description}</dd>
            </div>
            {pass.travel_date && (
              <div className="flex justify-between gap-4 border-b border-greyblue/20 py-1">
                <dt className="font-semibold text-navy">Travel date</dt>
                <dd>{pass.travel_date}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4 py-1">
              <dt className="font-semibold text-navy">Fee paid</dt>
              <dd className="font-semibold">{formatGBP(pass.amount)}</dd>
            </div>
          </dl>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/">Back home</ButtonLink>
          <ButtonLink href="/lost-property" variant="secondary">
            Lost property info
          </ButtonLink>
        </div>
      </div>
    </article>
  );
}
