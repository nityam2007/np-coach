import { directusAtomicUpdate, directusServerRead } from "@/lib/directus-server";

type PaymentCollection = "bookings" | "pass_purchases";
type ReversalStatus = "refunded" | "disputed";

/**
 * Reconcile a Stripe reversal by its PaymentIntent. We deliberately search both
 * payment collections and require exactly one result, so an ambiguous or missing
 * relationship makes the webhook retry instead of mutating the wrong order.
 */
export async function markPaymentReversed(
  paymentIntent: string,
  status: ReversalStatus,
): Promise<boolean> {
  if (!paymentIntent.startsWith("pi_")) return false;

  const matches: Array<{ collection: PaymentCollection; id: number; status: string }> = [];
  for (const collection of ["bookings", "pass_purchases"] as const) {
    const rows = await directusServerRead<Array<{ id: number; status: string }>>(
      `/items/${collection}?filter[stripe_payment_intent][_eq]=${encodeURIComponent(paymentIntent)}&fields=id,status&limit=2`,
    );
    if (rows === null || rows.length > 1) return false;
    if (rows.length === 1) matches.push({ collection, id: rows[0].id, status: rows[0].status });
  }

  if (matches.length !== 1) return false;
  const match = matches[0];
  if (match.status === status) return true;
  if (match.status !== "paid" && !(status === "refunded" && match.status === "disputed")) return false;
  return (await directusAtomicUpdate(
    match.collection,
    match.id,
    { status: match.status },
    { status },
  )) === true;
}
