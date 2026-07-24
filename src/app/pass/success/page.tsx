import type { Metadata } from "next";
import Link from "next/link";
import { getPassPurchaseByReference } from "@/lib/stripe";

export const metadata: Metadata = {
  title: "Lost property request received",
  description: "Your NP Coaches lost property reclaim request has been received.",
  robots: { index: false },
};

function formatGBP(pence: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}

export default async function PassSuccessPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  const pass = ref ? await getPassPurchaseByReference(ref) : null;

  return (
    <article className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <div className="rounded-xl border border-accent/40 bg-accent/5 p-8 text-navy">
        <h1 className="font-display text-3xl font-bold">Thank you — your request is in</h1>
        <p className="mt-3 text-navy/70">
          We&apos;ve received your reclaim request and payment. A receipt has been emailed to you by Stripe. Our team
          will check whether your item has been handed in and contact you. Items are held at our Iver depot for up to 14
          days.
        </p>

        {ref && (
          <p className="mt-6 text-sm">
            Reference: <span className="font-display text-lg font-bold text-navy">{ref}</span>
          </p>
        )}

        {pass && (
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

        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/"
            className="rounded-md bg-accent px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90"
          >
            Back home
          </Link>
          <Link
            href="/lost-property"
            className="rounded-md border border-greyblue/50 px-6 py-3 font-semibold text-navy transition-colors hover:bg-greyblue/10"
          >
            Lost property info
          </Link>
        </div>
      </div>
    </article>
  );
}
