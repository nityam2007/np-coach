import Stripe from "stripe";
import crypto from "node:crypto";
import { getRoutes, getStops, getSettings } from "@/lib/directus";
import { directusAtomicUpdate, directusServerRead, directusServerWrite } from "@/lib/directus-server";
import {
  sendBookingConfirmation,
  sendLostPropertyCustomerConfirmation,
  sendLostPropertyStaffNotification,
} from "@/lib/notifications";
import type { EmailResult } from "@/lib/email";
import type { Stop } from "@/lib/site-config";
import { findJourney } from "@/lib/booking-rules";

import { releaseInventory } from "@/lib/inventory";
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
  routeSlug: string;
  departureTime: string;
  travelDate: string;
  returnDate: string | null;
  returnRouteSlug: string | null;
  returnDepartureTime: string | null;
  outwardCapacity: number;
  returnCapacity: number | null;
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
  travelDate: string,
  returnDate?: string,
): Promise<PricedBooking | null> {
  if (!Number.isInteger(passengers) || passengers < 1 || passengers > 50) return null;
  if (tripType !== "single" && tripType !== "return") return null;
  if (!fromCode || !toCode || fromCode === toCode) return null;

  const [stops, routes, { pricing }] = await Promise.all([getStops(), getRoutes(), getSettings()]);
  const from = stops.find((s) => s.code === fromCode);
  const to = stops.find((s) => s.code === toCode);
  if (!from || !to) return null;

  const outward = findJourney(routes, fromCode, toCode, travelDate);
  if (!outward) return null;
  const inbound = tripType === "return" && returnDate ? findJourney(routes, toCode, fromCode, returnDate) : null;
  if (tripType === "return" && !inbound) return null;

  if (!Number.isInteger(outward.route.capacity) || (outward.route.capacity ?? 0) < 1) return null;
  if (inbound && (!Number.isInteger(inbound.route.capacity) || (inbound.route.capacity ?? 0) < 1)) return null;
  const net = tripType === "return" ? outward.route.priceReturn : outward.route.priceSingle;
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
    routeSlug: outward.route.slug,
    departureTime: outward.departureTime,
    travelDate,
    returnDate: tripType === "return" ? returnDate ?? null : null,
    returnRouteSlug: inbound?.route.slug ?? null,
    returnDepartureTime: inbound?.departureTime ?? null,
    outwardCapacity: outward.route.capacity ?? 0,
    returnCapacity: inbound?.route.capacity ?? null,
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
  return `NPX-${crypto.randomBytes(7).toString("base64url").toUpperCase()}`;
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
  route_slug: string;
  departure_time: string;
  return_date: string | null;
  return_route_slug: string | null;
  return_departure_time: string | null;
  trip_type: string;
  passengers: number;
  name: string;
  email: string;
  phone: string;
  outward_run_id: number | null;
  return_run_id: number | null;
  inventory_status: string | null;
  confirmation_email_status: string | null;
  confirmation_email_sent_at: string | null;
}

/** Create a `pending` booking before redirecting to payment. Returns the row (with id) or null. */
export async function createPendingBooking(data: {
  reference: string;
  fromStop: string;
  toStop: string;
  routeLabel: string;
  routeSlug: string;
  departureTime: string;
  returnDate: string | null;
  returnRouteSlug: string | null;
  returnDepartureTime: string | null;
  tripDate: string | null;
  tripType: TripType;
  passengers: number;
  amount: number;
  name: string;
  email: string;
  outwardRunId: number;
  returnRunId: number | null;
  inventoryStatus: "held";
  phone: string;
}): Promise<BookingRow | null> {
  return (await directusServerWrite("/items/bookings", "POST", {
    reference: data.reference,
    from_stop: data.fromStop,
    to_stop: data.toStop,
    route_label: data.routeLabel,
    trip_date: data.tripDate,
    route_slug: data.routeSlug,
    departure_time: data.departureTime,
    return_date: data.returnDate,
    return_route_slug: data.returnRouteSlug,
    return_departure_time: data.returnDepartureTime,
    trip_type: data.tripType,
    passengers: data.passengers,
    amount: data.amount,
    currency: "gbp",
    name: data.name,
    email: data.email,
    outward_run_id: data.outwardRunId,
    return_run_id: data.returnRunId,
    inventory_status: data.inventoryStatus,
    phone: data.phone,
    status: "pending",
  })) as BookingRow | null;
}

/** Attach the Stripe Checkout Session id to a row (used for webhook idempotency lookups). */
export async function attachSession(collection: string, id: number, sessionId: string): Promise<boolean> {
  return (await directusAtomicUpdate(
    collection,
    id,
    { status: "pending", stripe_session_id: null },
    { stripe_session_id: sessionId },
  )) === true;
}

export async function failPendingOrder(collection: string, id: number): Promise<boolean> {
  const fields = collection === "bookings" ? "id,status,passengers,outward_run_id,return_run_id,inventory_status" : "id,status";
  const rows = await directusServerRead<Array<{
    id: number;
    status: string;
    passengers?: number;
    outward_run_id?: number | null;
    return_run_id?: number | null;
    inventory_status?: string | null;
  }>>(`/items/${collection}?filter[id][_eq]=${id}&fields=${fields}&limit=2`);
  if (!rows || rows.length !== 1) return false;
  let row = rows[0];
  if (row.status === "paid" || row.status === "refunded" || row.status === "disputed") return true;

  if (row.status === "pending") {
    const data = collection === "bookings" ? { status: "failed", inventory_status: "releasing" } : { status: "failed" };
    const updated = await directusAtomicUpdate(collection, id, { status: "pending" }, data);
    if (updated !== true) return false;
    row = { ...row, ...data };
  }

  if (collection !== "bookings" || row.inventory_status === "released") return row.status === "failed";
  if (!row.passengers || !row.outward_run_id) return false;
  // Claim the release before decrementing. If the decrement response is lost, a
  // retry must leak capacity for manual reconciliation rather than double-release
  // seats and create an oversell.
  const inventoryStatus = row.inventory_status;
  if (inventoryStatus !== "held" && inventoryStatus !== "releasing") return false;
  const claimed = await directusAtomicUpdate(
    "bookings",
    id,
    { status: "failed", inventory_status: inventoryStatus },
    { inventory_status: "released" },
  );
  if (claimed !== true) return false;
  return releaseInventory(row.outward_run_id, row.return_run_id ?? null, row.passengers);
}


export async function failPendingBySession(
  collection: "bookings" | "pass_purchases",
  sessionId: string,
  reference?: string,
): Promise<boolean> {
  let rows = await directusServerRead<Array<{ id: number; status: string }>>(
    `/items/${collection}?filter[stripe_session_id][_eq]=${encodeURIComponent(sessionId)}&limit=2`,
  );
  if ((!rows || rows.length === 0) && reference) {
    rows = await directusServerRead<Array<{ id: number; status: string }>>(
      `/items/${collection}?filter[reference][_eq]=${encodeURIComponent(reference)}&limit=2`,
    );
  }
  if (!rows || rows.length !== 1) return false;
  return failPendingOrder(collection, rows[0].id);
}
export async function failStalePendingOrders(cutoff: string): Promise<boolean> {
  const encoded = encodeURIComponent(cutoff);
  for (const collection of ["bookings", "pass_purchases"] as const) {
    const rows = await directusServerRead<Array<{ id: number }>>(
      `/items/${collection}?filter[status][_eq]=pending&filter[created_at][_lt]=${encoded}&fields=id&sort=created_at&limit=100`,
    );
    if (rows === null) return false;
    for (const row of rows) {
      if (!(await failPendingOrder(collection, row.id))) return false;
    }
  }
  return true;
}

// Per-channel delivery state lives on the paid record. Conditional Directus updates
// claim each channel before SMTP is called, making webhook retries and the success-page
// fallback cooperate without intentionally sending duplicates.
type PaymentCollection = "bookings" | "pass_purchases";
type DeliveryStatusField = "confirmation_email_status" | "staff_email_status";
type DeliverySentAtField = "confirmation_email_sent_at" | "staff_email_sent_at";
type DeliveryStartedAtField = "confirmation_email_started_at" | "staff_email_started_at";

const sentAtField: Record<DeliveryStatusField, DeliverySentAtField> = {
  confirmation_email_status: "confirmation_email_sent_at",
  staff_email_status: "staff_email_sent_at",
};
const startedAtField: Record<DeliveryStatusField, DeliveryStartedAtField> = {
  confirmation_email_status: "confirmation_email_started_at",
  staff_email_status: "staff_email_started_at",
};


async function claimEmailDelivery(
  collection: PaymentCollection,
  id: number,
  statusField: DeliveryStatusField,
): Promise<string | false | null> {
  const now = new Date();
  const lease = now.toISOString();
  const staleBefore = new Date(now.getTime() - 10 * 60_000).toISOString();
  const startedField = startedAtField[statusField];
  const current = await directusServerRead<Record<string, string | null>>(
    `/items/${collection}/${id}?fields=status,${statusField},${startedField}`,
  );
  if (!current) return null;

  const currentStatus = current[statusField];
  const currentStarted = current[startedField];
  const staleSending = currentStatus === "sending" && (!currentStarted || currentStarted < staleBefore);
  const eligible = current.status === "paid"
    && (currentStatus === null || currentStatus === "pending" || currentStatus === "failed" || staleSending);
  if (!eligible) return false;

  const updated = await directusAtomicUpdate(
    collection,
    id,
    { status: "paid", [statusField]: currentStatus, [startedField]: currentStarted },
    { [statusField]: "sending", [startedField]: lease },
  );
  if (updated === null) return null;
  return updated ? lease : false;
}

async function finishEmailDelivery(
  collection: PaymentCollection,
  id: number,
  statusField: DeliveryStatusField,
  lease: string,
  delivered: boolean,
): Promise<boolean> {
  return (await directusAtomicUpdate(
    collection,
    id,
    { [statusField]: "sending", [startedAtField[statusField]]: lease },
    {
      [statusField]: delivered ? "sent" : "failed",
      [sentAtField[statusField]]: delivered ? new Date().toISOString() : null,
      [startedAtField[statusField]]: null,
    },
  )) === true;
}

async function deliverOnce(
  collection: PaymentCollection,
  id: number,
  statusField: DeliveryStatusField,
  send: () => Promise<EmailResult>,
): Promise<boolean> {
  const lease = await claimEmailDelivery(collection, id, statusField);
  if (lease === null) return false;
  if (lease === false) return true;

  const result = await send();
  const recorded = await finishEmailDelivery(collection, id, statusField, lease, result.delivered);
  return result.delivered && recorded;
}

async function deliverPaymentNotifications(
  collection: PaymentCollection,
  reference: string,
): Promise<boolean> {
  const settings = await getSettings();

  if (collection === "bookings") {
    const booking = await getByReference<BookingRow>(collection, reference);
    if (!booking) return false;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? settings.url;
    return deliverOnce(collection, booking.id, "confirmation_email_status", () =>
      sendBookingConfirmation(settings, booking, siteUrl),
    );
  }

  const pass = await getByReference<PassPurchaseRow>(collection, reference);
  if (!pass) return false;
  const [customerDelivered, staffDelivered] = await Promise.all([
    deliverOnce(collection, pass.id, "confirmation_email_status", () =>
      sendLostPropertyCustomerConfirmation(settings, pass),
    ),
    deliverOnce(collection, pass.id, "staff_email_status", () =>
      sendLostPropertyStaffNotification(settings, pass),
    ),
  ]);
  return customerDelivered && staffDelivered;
}

export async function markPaidBySession(
  collection: PaymentCollection,
  sessionId: string,
  paymentIntent: string | null,
  amountTotal: number | null,
  options: { requireEmailDelivery?: boolean; reference?: string } = {},
): Promise<string | null> {
  let rows = await directusServerRead<Array<{ id: number; status: string; reference: string }>>(
    `/items/${collection}?filter[stripe_session_id][_eq]=${encodeURIComponent(sessionId)}&limit=2`,
  );
  if ((!rows || rows.length === 0) && options.reference) {
    rows = await directusServerRead<Array<{ id: number; status: string; reference: string }>>(
      `/items/${collection}?filter[reference][_eq]=${encodeURIComponent(options.reference)}&limit=2`,
    );
    if (rows?.length === 1 && !(await attachSession(collection, rows[0].id, sessionId))) return null;
  }
  if (!rows || rows.length !== 1) return null;
  const row = rows[0];

  const verifiedAmount = Number.isInteger(amountTotal) && amountTotal !== null && amountTotal >= 0 ? amountTotal : null;
  if (row.status !== "paid") {
    if (row.status !== "pending") return null;
    const expected = collection === "bookings"
      ? { status: "pending", inventory_status: "held" }
      : { status: "pending" };
    const data = {
      status: "paid",
      stripe_payment_intent: paymentIntent,
      ...(collection === "bookings" ? { inventory_status: "committed" } : {}),
      ...(verifiedAmount !== null ? { amount: verifiedAmount } : {}),
    };
    const updated = await directusAtomicUpdate(collection, row.id, expected, data);
    if (updated !== true) return null;
  }

  const emailsDelivered = await deliverPaymentNotifications(collection, row.reference);
  if (!emailsDelivered && options.requireEmailDelivery) {
    throw new Error(`Transactional email delivery failed for ${collection}/${row.reference}`);
  }
  return row.reference;
}


/** Verify the Checkout session with Stripe after redirect, never from a public reference. */
export async function confirmCheckoutSession(sessionId: string, kind: "booking" | "pass"): Promise<string | null> {
  if (!stripeConfigured() || !sessionId.startsWith("cs_")) return null;
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (
      (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") ||
      session.metadata?.kind !== kind
    ) {
      return null;
    }
    const collection = kind === "pass" ? "pass_purchases" : "bookings";
    return markPaidBySession(
      collection,
      session.id,
      typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null),
      session.amount_total,
      { reference: session.metadata?.reference },
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
  phone: string;
  travel_time: string;
  school_route: boolean;
  school: string;
  route: string;
  where_left: string;
  notes: string;
  confirmation_email_status: string | null;
  confirmation_email_sent_at: string | null;
  staff_email_status: string | null;
  staff_email_sent_at: string | null;
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
