import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { failPendingBySession, getStripe, markPaidBySession } from "@/lib/stripe";
import { markPaymentReversed } from "@/lib/payment-events";

/**
 * Stripe webhook. Verifies the signature against the raw body (forged/replayed
 * payloads are rejected before any logic), then idempotently marks the matching
 * order `paid` on checkout.session.completed. Stripe retries on non-2xx, and
 * the idempotent Directus update makes duplicate deliveries safe.
 */

// Ensure the raw body is available and the handler always runs on the server at request time.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "webhook not configured" }, { status: 500 });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "missing signature" }, { status: 400 });

  const payload = await req.text(); // raw body — required for signature verification

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, secret);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === "paid" || session.payment_status === "no_payment_required") {
      const paymentIntent =
        typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null);
      // `kind` metadata tells us which collection this session belongs to.
      const kind = session.metadata?.kind;
      if (kind === "booking" || kind === "pass") {
        const collection = kind === "pass" ? "pass_purchases" : "bookings";
        try {
          const reference = await markPaidBySession(collection, session.id, paymentIntent, session.amount_total, {
            amountSubtotal: session.amount_subtotal,
            amountDiscount: session.total_details?.amount_discount ?? null,
            reference: session.metadata?.reference,
          });
          if (!reference) throw new Error(`No unique order found for Checkout Session ${session.id}`);
        } catch (error) {
          console.error("[stripe] post-payment processing failed", error);
          return NextResponse.json({ error: "post-payment processing failed" }, { status: 500 });
        }
      }
    }
  }

  if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const kind = session.metadata?.kind;
    if (kind === "booking" || kind === "pass") {
      const collection = kind === "pass" ? "pass_purchases" : "bookings";
      const failed = await failPendingBySession(collection, session.id, session.metadata?.reference);
      if (!failed) {
        console.error(`[stripe] no unique pending order found for expired session ${session.id}`);
        return NextResponse.json({ error: "order reconciliation failed" }, { status: 500 });
      }
    }
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    if (charge.refunded) {
      const paymentIntent = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
      if (!paymentIntent || !(await markPaymentReversed(paymentIntent, "refunded"))) {
        return NextResponse.json({ error: "refund reconciliation failed" }, { status: 500 });
      }
    }
  }

  if (event.type === "charge.dispute.created") {
    const dispute = event.data.object as Stripe.Dispute;
    const paymentIntent = typeof dispute.payment_intent === "string" ? dispute.payment_intent : dispute.payment_intent?.id;
    if (!paymentIntent || !(await markPaymentReversed(paymentIntent, "disputed"))) {
      return NextResponse.json({ error: "dispute reconciliation failed" }, { status: 500 });
    }
  }

  // Payment state/inventory is authoritative here. Email delivery is logged and
  // retried independently, so a temporary SMTP issue never makes Stripe retry a
  // payment that has already been safely reconciled.
  return NextResponse.json({ received: true });
}
