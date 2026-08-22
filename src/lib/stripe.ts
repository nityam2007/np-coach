import Stripe from "stripe";
import crypto from "node:crypto";
import { getScheduledServices, getStops, getSettings } from "@/lib/directus";
import { directusAtomicUpdate, directusClaimPaymentEmail, directusCommitPaidBookingInventory, directusFinishPaymentEmail, directusReconcilePaidBookingInventory, directusServerRead, directusServerWrite, type AtomicInventoryRun } from "@/lib/directus-server";
import {
  sendBookingConfirmation,
  sendLostPropertyCustomerConfirmation,
  sendLostPropertyStaffNotification,
} from "@/lib/notifications";
import type { EmailResult } from "@/lib/email";
import type { Stop } from "@/lib/site-config";
import { findJourneyByCode } from "@/lib/booking-rules";
import { siteUrl } from "@/lib/site-url";

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
  outwardUnitAmount: number;
  returnUnitAmount: number;
  amount: number; // total pence, VAT-inclusive
  vatRate: number; // % applied
  label: string;
  routeSlug: string;
  outwardServiceCode: string;
  outwardServiceName: string;
  arrivalTime: string;
  returnServiceCode: string | null;
  returnServiceName: string | null;
  departureTime: string;
  travelDate: string;
  returnDate: string | null;
  returnRouteSlug: string | null;
  returnDepartureTime: string | null;
  returnArrivalTime: string | null;
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
  outwardServiceCode: string,
  returnDate?: string,
  returnServiceCode?: string,
): Promise<PricedBooking | null> {
  if (!Number.isInteger(passengers) || passengers < 1 || passengers > 50) return null;
  if (tripType !== "single" && tripType !== "return") return null;
  if (!fromCode || !toCode || fromCode === toCode) return null;

  const [stops, services, { pricing }] = await Promise.all([getStops(), getScheduledServices(), getSettings()]);
  const from = stops.find((s) => s.code === fromCode);
  const to = stops.find((s) => s.code === toCode);
  if (!from || !to) return null;

  const outward = findJourneyByCode(services, outwardServiceCode, fromCode, toCode, travelDate);
  if (!outward) return null;
  const inbound = tripType === "return" && returnDate && returnServiceCode
    ? findJourneyByCode(services, returnServiceCode, toCode, fromCode, returnDate)
    : null;
  if (tripType === "return" && !inbound) return null;

  const outwardGross = computeGross(outward.fare.adult, pricing.dailyExpressVat).gross;
  const returnGross = inbound ? computeGross(inbound.fare.adult, pricing.dailyExpressVat).gross : 0;
  const unitAmount = outwardGross + returnGross;

  return {
    from,
    to,
    tripType,
    passengers,
    unitAmount,
    amount: unitAmount * passengers,
    vatRate: pricing.dailyExpressVat,
    label: `${from.name} to ${to.name} — ${tripType === "return" ? "return" : "single"}`,
    outwardUnitAmount: outwardGross,
    returnUnitAmount: returnGross,
    routeSlug: outward.service.routeSlug,
    outwardServiceCode: outward.service.code,
    outwardServiceName: outward.service.name,
    departureTime: outward.departureTime,
    arrivalTime: outward.arrivalTime,
    travelDate,
    returnDate: tripType === "return" ? returnDate ?? null : null,
    returnServiceName: inbound?.service.name ?? null,
    returnRouteSlug: inbound?.service.routeSlug ?? null,
    returnServiceCode: inbound?.service.code ?? null,
    returnDepartureTime: inbound?.departureTime ?? null,
    returnArrivalTime: inbound?.arrivalTime ?? null,
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
export interface BookingLegSnapshot {
  serviceCode: string;
  serviceName: string;
  routeSlug: string;
  date: string;
  fromCode: string;
  fromName: string;
  departureTime: string;
  toCode: string;
  toName: string;
  arrivalTime: string;
  farePerPassenger: number;
}

export interface BookingJourneySnapshot {
  outward: BookingLegSnapshot;
  return: BookingLegSnapshot | null;
  passengers: number;
  amount: number;
}

export interface BookingRow {
  id: number;
  reference: string;
  status: string;
  amount: number;
  subtotal_amount: number | null;
  discount_amount: number | null;
  currency: string;
  from_stop: string;
  to_stop: string;
  route_label: string;
  trip_date: string | null;
  route_slug: string;
  departure_time: string;
  return_date: string | null;
  outward_service_code: string;
  outward_service_name: string;
  arrival_time: string;
  journey_snapshot: BookingJourneySnapshot | null;
  return_route_slug: string | null;
  return_departure_time: string | null;
  trip_type: string;
  passengers: number;
  return_service_code: string | null;
  return_service_name: string | null;
  return_arrival_time: string | null;
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
  outwardServiceCode: string;
  outwardServiceName: string;
  arrivalTime: string;
  journeySnapshot: BookingJourneySnapshot;
  returnDepartureTime: string | null;
  tripDate: string | null;
  tripType: TripType;
  passengers: number;
  amount: number;
  returnServiceCode: string | null;
  returnServiceName: string | null;
  returnArrivalTime: string | null;
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
    route_slug: data.routeSlug,
    departure_time: data.departureTime,
    return_date: data.returnDate,
    return_route_slug: data.returnRouteSlug,
    return_departure_time: data.returnDepartureTime,
    outward_service_code: data.outwardServiceCode,
    outward_service_name: data.outwardServiceName,
    arrival_time: data.arrivalTime,
    journey_snapshot: data.journeySnapshot,
    trip_type: data.tripType,
    passengers: data.passengers,
    subtotal_amount: data.amount,
    discount_amount: 0,
    amount: data.amount,
    currency: "gbp",
    return_service_code: data.returnServiceCode,
    return_service_name: data.returnServiceName,
    return_arrival_time: data.returnArrivalTime,
    name: data.name,
    email: data.email,
    outward_run_id: null,
    return_run_id: null,
    inventory_status: "unreserved",
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
    const data = collection === "bookings"
      ? { status: "failed", inventory_status: row.inventory_status === "held" ? "releasing" : (row.inventory_status ?? "unreserved") }
      : { status: "failed" };
    const updated = await directusAtomicUpdate(collection, id, { status: "pending" }, data);
    if (updated !== true) return false;
    row = { ...row, ...data };
  }

  if (collection !== "bookings" || row.inventory_status === "released") return row.status === "failed";
  if (row.inventory_status !== "held" && row.inventory_status !== "releasing") return row.status === "failed";
  if (!row.passengers || !row.outward_run_id) return false;

  // Compatibility cleanup for reservations created by earlier releases before paid-only inventory.
  // Claim before decrementing so retries cannot release the same seats twice.
  const inventoryStatus = row.inventory_status;
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


async function claimEmailDelivery(
  collection: PaymentCollection,
  id: number,
  statusField: DeliveryStatusField,
): Promise<string | "complete" | "busy" | null> {
  const now = new Date();
  const lease = now.toISOString();
  const staleBefore = new Date(now.getTime() - 10 * 60_000).toISOString();
  const result = await directusClaimPaymentEmail({
    collection,
    id,
    statusField,
    lease,
    staleBefore,
  });
  if (!result) return null;
  if (result.completed) return "complete";
  return result.claimed ? lease : "busy";
}

async function finishEmailDelivery(
  collection: PaymentCollection,
  id: number,
  statusField: DeliveryStatusField,
  lease: string,
  delivered: boolean,
): Promise<boolean> {
  return directusFinishPaymentEmail({
    collection,
    id,
    statusField,
    lease,
    delivered,
  });
}

async function deliverOnce(
  collection: PaymentCollection,
  id: number,
  statusField: DeliveryStatusField,
  send: () => Promise<EmailResult>,
): Promise<boolean> {
  const lease = await claimEmailDelivery(collection, id, statusField);
  if (lease === null) return false;
  if (lease === "complete") return true;
  if (lease === "busy") return false;

  let result: EmailResult;
  try {
    result = await send();
  } catch (error) {
    console.error("[email] transactional template/delivery failed", error);
    await finishEmailDelivery(collection, id, statusField, lease, false);
    return false;
  }
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
    const publicUrl = siteUrl(settings.url);
    return deliverOnce(collection, booking.id, "confirmation_email_status", () =>
      sendBookingConfirmation(settings, booking, publicUrl),
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

async function paidBookingRuns(booking: BookingRow): Promise<AtomicInventoryRun[] | null> {
  const snapshot = booking.journey_snapshot;
  if (!snapshot || snapshot.passengers !== booking.passengers || booking.passengers < 1) return null;

  const services = await getScheduledServices();
  const legs = [snapshot.outward, snapshot.return].filter((leg): leg is BookingLegSnapshot => leg !== null);
  const runs: AtomicInventoryRun[] = [];
  for (const leg of legs) {
    const service = services.find((candidate) => candidate.code === leg.serviceCode);
    if (!service || service.salesMode !== "online" || service.routeSlug !== leg.routeSlug
      || !Number.isInteger(service.capacity) || service.capacity < 1 || service.capacity > 500) {
      return null;
    }
    runs.push({
      routeSlug: leg.routeSlug,
      serviceCode: leg.serviceCode,
      serviceDate: leg.date,
      departureTime: leg.departureTime,
      capacity: service.capacity,
    });
  }
  return runs.length >= 1 && runs.length <= 2 ? runs : null;
}

export async function markPaidBySession(
  collection: PaymentCollection,
  sessionId: string,
  paymentIntent: string | null,
  amountTotal: number | null,
  options: { amountSubtotal?: number | null; amountDiscount?: number | null; reference?: string } = {},
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
  const verifiedSubtotal = Number.isInteger(options.amountSubtotal) && options.amountSubtotal !== null && Number(options.amountSubtotal) >= 0
    ? Number(options.amountSubtotal)
    : null;
  const verifiedDiscount = Number.isInteger(options.amountDiscount) && options.amountDiscount !== null && Number(options.amountDiscount) >= 0
    ? Number(options.amountDiscount)
    : null;
  if (row.status !== "paid") {
    if (row.status !== "pending") return null;

    if (collection === "bookings") {
      const booking = await getBookingByReference(row.reference);
      if (!booking) return null;

      if (booking.inventory_status === "held" && booking.outward_run_id) {
        // Complete checkout holds created before the paid-only inventory release without deducting twice.
        const updated = await directusAtomicUpdate(
          collection,
          row.id,
          { status: "pending", inventory_status: "held" },
          {
            status: "paid",
            stripe_payment_intent: paymentIntent,
            inventory_status: "committed",
            ...(verifiedSubtotal !== null ? { subtotal_amount: verifiedSubtotal } : {}),
            ...(verifiedDiscount !== null ? { discount_amount: verifiedDiscount } : {}),
            ...(verifiedAmount !== null ? { amount: verifiedAmount } : {}),
          },
        );
        if (updated !== true) return null;
      } else {
        const runs = await paidBookingRuns(booking);
        if (!runs) return null;
        const committed = await directusCommitPaidBookingInventory({
          bookingId: row.id,
          sessionId,
          paymentIntent,
          amountTotal: verifiedAmount,
          amountSubtotal: verifiedSubtotal,
          amountDiscount: verifiedDiscount,
          runs,
          seats: booking.passengers,
        });
        if (!committed.ok || committed.reference !== row.reference) {
          console.error(`[stripe] paid booking inventory commit failed: ${committed.ok ? "reference mismatch" : committed.reason}`);
          return null;
        }
      }
    } else {
      const updated = await directusAtomicUpdate(
        collection,
        row.id,
        { status: "pending" },
        {
          status: "paid",
          stripe_payment_intent: paymentIntent,
          ...(verifiedSubtotal !== null ? { subtotal_amount: verifiedSubtotal } : {}),
          ...(verifiedDiscount !== null ? { discount_amount: verifiedDiscount } : {}),
          ...(verifiedAmount !== null ? { amount: verifiedAmount } : {}),
        },
      );
      if (updated !== true) return null;
    }
  }

  const emailsDelivered = await deliverPaymentNotifications(collection, row.reference);
  if (!emailsDelivered) console.error(`[email] transactional delivery queued for retry: ${collection}/${row.reference}`);
  return row.reference;
}

/** Reconcile a CMS-paid order and send its transactional emails exactly once. */
export async function reconcilePaidOrder(collection: PaymentCollection, id: number): Promise<boolean> {
  if (!Number.isInteger(id) || id < 1) return false;

  if (collection === "bookings") {
    const booking = await getById<BookingRow>(collection, id);
    if (!booking || booking.status !== "paid") return false;

    if (booking.inventory_status === "held" && booking.outward_run_id) {
      const committed = await directusAtomicUpdate(
        collection,
        booking.id,
        { status: "paid", inventory_status: "held" },
        { inventory_status: "committed" },
      );
      if (committed !== true) return false;
    } else if (booking.inventory_status !== "committed") {
      if ((booking.inventory_status !== null && booking.inventory_status !== "unreserved")
        || booking.outward_run_id !== null || booking.return_run_id !== null) {
        return false;
      }
      const runs = await paidBookingRuns(booking);
      if (!runs) return false;
      const committed = await directusReconcilePaidBookingInventory(booking.id, runs, booking.passengers);
      if (!committed.ok || committed.reference !== booking.reference) {
        console.error(`[email] manual paid booking reconciliation failed: ${committed.ok ? "reference mismatch" : committed.reason}`);
        return false;
      }
    }
    return deliverPaymentNotifications(collection, booking.reference);
  }

  const pass = await getById<PassPurchaseRow>(collection, id);
  if (!pass || pass.status !== "paid") return false;
  return deliverPaymentNotifications(collection, pass.reference);
}

/** Retry CMS-paid inventory reconciliation and unsent payment emails. */
export async function retryPaidNotifications(limit = 500): Promise<boolean> {
  const [bookings, passes] = await Promise.all([
    directusServerRead<Array<{
      id: number;
      inventory_status: string | null;
      confirmation_email_status: string | null;
    }>>(`/items/bookings?filter[status][_eq]=paid&fields=id,inventory_status,confirmation_email_status&sort=-id&limit=${limit}`),
    directusServerRead<Array<{
      id: number;
      confirmation_email_status: string | null;
      staff_email_status: string | null;
    }>>(`/items/pass_purchases?filter[status][_eq]=paid&fields=id,confirmation_email_status,staff_email_status&sort=-id&limit=${limit}`),
  ]);
  if (bookings === null || passes === null) return false;

  const targets: Array<{ collection: PaymentCollection; id: number }> = [
    ...bookings
      .filter((row) => row.inventory_status !== "committed" || row.confirmation_email_status !== "sent")
      .map((row) => ({ collection: "bookings" as const, id: row.id })),
    ...passes
      .filter((row) => row.confirmation_email_status !== "sent" || row.staff_email_status !== "sent")
      .map((row) => ({ collection: "pass_purchases" as const, id: row.id })),
  ];

  let complete = true;
  for (const target of targets) {
    if (!(await reconcilePaidOrder(target.collection, target.id))) complete = false;
  }
  return complete;
}

/** Verify the Checkout session with Stripe after redirect, never from a public reference. */
export async function confirmCheckoutSession(sessionId: string, kind: "booking" | "pass"): Promise<string | null> {
  if (!sessionId.startsWith("cs_")) return null;
  const collection = kind === "pass" ? "pass_purchases" : "bookings";

  // The signed webhook may finish before this return-page request, while a
  // second Stripe API read or notification attempt can still fail transiently.
  // A Checkout Session id is high entropy; it may reveal only an order that the
  // authoritative webhook/CMS reconciliation has already marked paid. It never
  // promotes a pending row or commits inventory here.
  const paidWebhookResult = async (verifiedReference?: string | null): Promise<string | null> => {
    const fields = collection === "bookings" ? "reference,status,inventory_status" : "reference,status";
    const filter = verifiedReference
      ? `filter[reference][_eq]=${encodeURIComponent(verifiedReference)}`
      : `filter[stripe_session_id][_eq]=${encodeURIComponent(sessionId)}`;
    const rows = await directusServerRead<Array<{ reference: string; status: string; inventory_status?: string | null }>>(
      `/items/${collection}?${filter}&fields=${fields}&limit=2`,
    );
    if (!rows || rows.length !== 1 || rows[0].status !== "paid") return null;
    if (collection === "bookings" && rows[0].inventory_status !== "committed") return null;
    try {
      await deliverPaymentNotifications(collection, rows[0].reference);
    } catch (error) {
      // The paid order remains authoritative; maintenance and authenticated
      // ticket access can retry this same idempotent notification channel.
      console.error("[email] paid Checkout return notification retry failed", error);
    }
    return rows[0].reference;
  };

  if (!stripeConfigured()) return paidWebhookResult();

  let verifiedReference: string | null = null;
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (
      (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") ||
      session.metadata?.kind !== kind
    ) {
      return null;
    }
    verifiedReference = session.metadata?.reference ?? null;
    const reference = await markPaidBySession(
      collection,
      session.id,
      typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null),
      session.amount_total,
      {
        amountSubtotal: session.amount_subtotal,
        amountDiscount: session.total_details?.amount_discount ?? null,
        reference: session.metadata?.reference,
      },
    );
    return reference ?? paidWebhookResult(verifiedReference);
  } catch (error) {
    console.error("[stripe] Checkout return verification failed; checking paid webhook state", error);
    return paidWebhookResult(verifiedReference);
  }
}
async function getById<T>(collection: string, id: number): Promise<T | null> {
  return directusServerRead<T>(`/items/${collection}/${id}`);
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
  subtotal_amount: number | null;
  discount_amount: number | null;
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
    subtotal_amount: data.amount,
    discount_amount: 0,
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
