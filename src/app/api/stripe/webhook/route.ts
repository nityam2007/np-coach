import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, markPaidBySession } from "@/lib/stripe";

/**
 * Stripe webhook. Verifies the signature against the raw body (forged/replayed
 * payloads are rejected before any logic), then idempotently marks the matching
 * booking `paid` on checkout.session.completed. Stripe retries on non-2xx, and
 * markBookingPaid only flips `pending → paid`, so duplicate deliveries are no-ops.
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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === "paid") {
      const paymentIntent =
        typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null);
      // `kind` metadata tells us which collection this session belongs to.
      const kind = session.metadata?.kind;
      if (kind === "booking" || kind === "pass") {
        const collection = kind === "pass" ? "pass_purchases" : "bookings";
        try {
          await markPaidBySession(collection, session.id, paymentIntent, {
            requireEmailDelivery: true,
          });
        } catch (error) {
          console.error("[stripe] post-payment email failed", error);
          return NextResponse.json({ error: "post-payment delivery failed" }, { status: 500 });
        }
      }
    }
  }

  // Acknowledge only after payment state and required transactional emails succeed.
  return NextResponse.json({ received: true });
}
