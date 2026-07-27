import Stripe from "stripe";
import { getStops, getSettings } from "@/lib/directus";
import { directusServerRead, directusServerWrite } from "@/lib/directus-server";
import type { Stop } from "@/lib/site-config";

/**
 * Stripe + booking server helpers. The price is ALWAYS computed here from the
 * Directus `routes` fares — the client never sends an amount. Bookings are written
 * to Directus with an authenticated (server-only) token; the public never reads them.
 */

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;

/** Lazily-constructed Stripe client. Throws clearly if the key isn't configured. */
export function getStripe(): Stripe {
  if (!STRIPE_SECRET) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(STRIPE_SECRET);
}

export function stripeConfigured(): boolean {
  return Boolean(STRIPE_SECRET);
}

/** Add VAT to a net amount (pence) at the given whole-number rate. Returns {net, vat, gross}. */
export function computeGross(net: number, vatRate: number): { net: number; vat: number; gross: number } {
  const rate = Number.isFinite(vatRate) && vatRate > 0 ? vatRate : 0;
  const vat = Math.round((net * rate) / 100);
  return { net, vat, gross: net + vat };
}

export type TripType = "single" | "return";

export interface PricedBooking {
  from: Stop;
  to: Stop;
  tripType: TripType;
  passengers: number;
  unitAmount: number; // pence per passenger, VAT-inclusive
  amount: number; // total pence, VAT-inclusive
  vatRate: number; // % applied
  label: string;
}

/**
 * Price a Daily Express leg (from-stop → to-stop) server-side using the flat
 * corridor fare + configured VAT. Resolves the stops from Directus so an arbitrary
 * client-sent amount can never be trusted. Returns null on invalid inputs.
 */
export async function priceBooking(
  fromCode: string,
  toCode: string,
  tripType: TripType,
  passengers: number,
): Promise<PricedBooking | null> {
  if (!Number.isInteger(passengers) || passengers < 1 || passengers > 50) return null;
  if (tripType !== "single" && tripType !== "return") return null;
  if (!fromCode || !toCode || fromCode === toCode) return null;

  const stops = await getStops();
  const from = stops.find((s) => s.code === fromCode);
  const to = stops.find((s) => s.code === toCode);
  if (!from || !to) return null;

  const { pricing } = await getSettings();
  const net = tripType === "return" ? pricing.dailyExpressReturn : pricing.dailyExpressSingle;
  if (!Number.isInteger(net) || net <= 0) return null;

  const unitAmount = computeGross(net, pricing.dailyExpressVat).gross;

  return {
    from,
    to,
    tripType,
    passengers,
    unitAmount,
    amount: unitAmount * passengers,
    vatRate: pricing.dailyExpressVat,
    label: `${from.name} to ${to.name} — ${tripType === "return" ? "return" : "single"}`,
  };
}

export interface PricedPass {
  net: number;
  vat: number;
  vatRate: number;
  amount: number; // gross pence
  label: string;
}

/** Price the Lost Property reclaim pass from the CMS fee + VAT rate. */
export async function priceLostPropertyPass(): Promise<PricedPass> {
  const { pricing } = await getSettings();
  const { net, vat, gross } = computeGross(pricing.lostPropertyFee, pricing.lostPropertyVat);
  return { net, vat, vatRate: pricing.lostPropertyVat, amount: gross, label: "Lost Property reclaim admin fee" };
}

// ---- Booking reference ----
// Human-friendly, collision-resistant reference. Time-based + random suffix.
export function bookingReference(): string {
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  const stamp = Date.now().toString(36).slice(-4).toUpperCase();
  return `NPX-${stamp}${rand}`;
}

// ---- Authenticated Directus access for bookings (server-only) ----
export interface BookingRow {
  id: number;
  reference: string;
  status: string;
  amount: number;
  currency: string;
  from_stop: string;
  to_stop: string;
  route_label: string;
  trip_date: string | null;
  trip_type: string;
  passengers: number;
  name: string;
  email: string;
}

/** Create a `pending` booking before redirecting to payment. Returns the row (with id) or null. */
export async function createPendingBooking(data: {
  reference: string;
  fromStop: string;
  toStop: string;
  routeLabel: string;
  tripDate: string | null;
  tripType: TripType;
  passengers: number;
  amount: number;
  name: string;
  email: string;
  phone: string;
}): Promise<BookingRow | null> {
  return (await directusServerWrite("/items/bookings", "POST", {
    reference: data.reference,
    from_stop: data.fromStop,
    to_stop: data.toStop,
    route_label: data.routeLabel,
    trip_date: data.tripDate,
    trip_type: data.tripType,
    passengers: data.passengers,
    amount: data.amount,
    currency: "gbp",
    name: data.name,
    email: data.email,
    phone: data.phone,
    status: "pending",
  })) as BookingRow | null;
}

/** Attach the Stripe Checkout Session id to a row (used for webhook idempotency lookups). */
export async function attachSession(collection: string, id: number, sessionId: string): Promise<void> {
  await directusServerWrite(`/items/${collection}/${id}`, "PATCH", { stripe_session_id: sessionId });
}

/**
 * Mark a row paid by its Stripe session id — idempotent: only flips a `pending` row
 * to `paid`, so duplicate webhook deliveries are no-ops. Works for any collection
 * with `status` + `stripe_session_id` + `reference`. Returns the reference or null.
 */
export async function markPaidBySession(
  collection: string,
  sessionId: string,
  paymentIntent: string | null,
): Promise<string | null> {
  const rows = await directusServerRead<Array<{ id: number; status: string; reference: string }>>(
    `/items/${collection}?filter[stripe_session_id][_eq]=${encodeURIComponent(sessionId)}&limit=1`,
  );
  const row = rows?.[0];
  if (!row) return null;
  if (row.status !== "paid") {
    await directusServerWrite(`/items/${collection}/${row.id}`, "PATCH", {
      status: "paid",
      stripe_payment_intent: paymentIntent,
    });
  }
  return row.reference;
}


/** Verify the Checkout session with Stripe after redirect, never from a public reference. */
export async function confirmCheckoutSession(sessionId: string, kind: "booking" | "pass"): Promise<string | null> {
  if (!stripeConfigured() || !sessionId.startsWith("cs_")) return null;
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid" || session.metadata?.kind !== kind) return null;
    const collection = kind === "pass" ? "pass_purchases" : "bookings";
    return markPaidBySession(
      collection,
      session.id,
      typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null),
    );
  } catch {
    return null;
  }
}
async function getByReference<T>(collection: string, reference: string): Promise<T | null> {
/** Read a row by reference for the success page (server-side only). */
  const rows = await directusServerRead<T[]>(
    `/items/${collection}?filter[reference][_eq]=${encodeURIComponent(reference)}&limit=1`,
  );
  return rows?.[0] ?? null;
}

export function getBookingByReference(reference: string): Promise<BookingRow | null> {
  return getByReference<BookingRow>("bookings", reference);
}

// ---- Lost Property pass purchases (P5) ----
export interface PassPurchaseRow {
  id: number;
  reference: string;
  status: string;
  amount: number;
  currency: string;
  name: string;
  email: string;
  item_description: string;
  travel_date: string | null;
}

/** Create a `pending` pass purchase before redirecting to payment. */
export async function createPendingPassPurchase(data: {
  reference: string;
  amount: number;
  name: string;
  email: string;
  phone: string;
  travelDate: string | null;
  travelTime: string;
  schoolRoute: boolean;
  school: string;
  route: string;
  whereLeft: string;
  itemDescription: string;
  notes: string;
}): Promise<PassPurchaseRow | null> {
  return (await directusServerWrite("/items/pass_purchases", "POST", {
    reference: data.reference,
    amount: data.amount,
    currency: "gbp",
    name: data.name,
    email: data.email,
    phone: data.phone,
    travel_date: data.travelDate,
    travel_time: data.travelTime,
    school_route: data.schoolRoute,
    school: data.school,
    route: data.route,
    where_left: data.whereLeft,
    item_description: data.itemDescription,
    notes: data.notes,
    status: "pending",
  })) as PassPurchaseRow | null;
}

export function getPassPurchaseByReference(reference: string): Promise<PassPurchaseRow | null> {
  return getByReference<PassPurchaseRow>("pass_purchases", reference);
}
