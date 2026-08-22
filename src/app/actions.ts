"use server";

import {
  contactSchema,
  bookingSchema,
  lostPropertySchema,
  fieldErrors,
  verifyTurnstile,
  quoteSchema,
  createSubmission,
  type FormState,
} from "@/lib/forms";
import {
  getStripe,
  priceBooking,
  priceLostPropertyPass,
  bookingReference,
  createPendingBooking,
  createPendingPassPurchase,
  attachSession,
  failPendingOrder,
} from "@/lib/stripe";
import { upsertCustomer } from "@/lib/account";
import { getSettings } from "@/lib/directus";
import { deliverLead } from "@/lib/lead-delivery";
import { clientIp, rateLimited, rateLimitKey, RATE_LIMITS } from "@/lib/security";
import { releaseInventory, reserveInventory } from "@/lib/inventory";


export async function submitContact(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const data = parsed.data;

  const ip = await clientIp();
  if (await rateLimited(rateLimitKey("contact", ip), RATE_LIMITS.contact)) {
    return { ok: false, message: "Too many submissions — please try again in 10 minutes." };
  }

  const token = formData.get("cf-turnstile-response");
  if (!(await verifyTurnstile(typeof token === "string" ? token : undefined, ip))) {
    return { ok: false, message: "Spam check failed — please try again." };
  }

  const saved = await createSubmission("contact_submissions", {
    name: data.name,
    email: data.email,
    phone: data.phone,
    subject: data.subject,
    message: data.message,
  });
  if (!saved) return { ok: false, message: "Something went wrong saving your message. Please call us instead." };
  const delivered = await deliverLead("contact_submissions", saved.id).catch(() => false);
  return delivered
    ? { ok: true, message: "Thanks — we've received your message and aim to reply within 24 hours." }
    : { ok: true, message: "Thanks — your message is saved. Email delivery is queued for retry." };
}

export async function submitQuote(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = quoteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const data = parsed.data;

  const ip = await clientIp();
  if (await rateLimited(rateLimitKey("quote", ip), RATE_LIMITS.quote)) {
    return { ok: false, message: "Too many submissions — please try again in 10 minutes." };
  }
  const token = formData.get("cf-turnstile-response");
  if (!(await verifyTurnstile(typeof token === "string" ? token : undefined, ip))) {
    return { ok: false, message: "Spam check failed — please try again." };
  }

  const saved = await createSubmission("quote_requests", {
    name: data.name, email: data.email, phone: data.phone, pickup: data.pickup, destination: data.destination,
    outbound_date: data.outboundDate, return_date: data.returnDate || null, passengers: data.passengers,
    coach_size: data.coachSize, journey_details: data.journeyDetails,
  });
  if (!saved) return { ok: false, message: "Something went wrong saving your request. Please call us instead." };
  const delivered = await deliverLead("quote_requests", saved.id).catch(() => false);
  return delivered
    ? { ok: true, message: "Thanks — we have your quote request and will be in touch shortly." }
    : { ok: true, message: "Thanks — your quote request is saved. Email delivery is queued for retry." };
}

export async function startBooking(_prev: FormState, formData: FormData): Promise<FormState> {
  // Capacity is not yet modelled atomically per departure. Keep paid ticket sales
  // fail-closed in production so concurrent checkouts cannot oversell a service.
  if (process.env.NODE_ENV === "production" && process.env.DAILY_EXPRESS_BOOKINGS_ENABLED !== "true") {
    return { ok: false, message: "Online Daily Express booking is temporarily unavailable. Please call us to book." };
  }

  const parsed = bookingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const data = parsed.data;

  const ip = await clientIp();
  if (await rateLimited(rateLimitKey("booking", ip), RATE_LIMITS.checkout)) {
    return { ok: false, message: "Too many attempts — please try again in 10 minutes." };
  }

  const token = formData.get("cf-turnstile-response");
  if (!(await verifyTurnstile(typeof token === "string" ? token : undefined, ip))) {
    return { ok: false, message: "Spam check failed — please try again." };
  }

  // Price is computed server-side from Directus — the client never sends an amount.
  const priced = await priceBooking(data.from, data.to, data.tripType, data.passengers, data.date, data.returnDate);
  if (!priced) return { ok: false, message: "That journey or passenger count isn't available. Please check and try again." };

  if (!process.env.STRIPE_SECRET_KEY) {
    return { ok: false, message: "Online payments are not available at the moment. Please call us to book." };
  }
  const reservation = await reserveInventory(
    {
      routeSlug: priced.routeSlug,
      serviceDate: priced.travelDate,
      departureTime: priced.departureTime,
      capacity: priced.outwardCapacity,
    },
    priced.returnRouteSlug && priced.returnDate && priced.returnDepartureTime && priced.returnCapacity
      ? {
          routeSlug: priced.returnRouteSlug,
          serviceDate: priced.returnDate,
          departureTime: priced.returnDepartureTime,
          capacity: priced.returnCapacity,
        }
      : null,
    priced.passengers,
  );
  if (!reservation) {
    return { ok: false, message: "That departure no longer has enough seats available. Please choose another journey or call us." };
  }
  const reference = bookingReference();
  // Persist the booking as `pending` BEFORE payment (data-safety rule).
  const booking = await createPendingBooking({
    reference,
    fromStop: priced.from.code,
    toStop: priced.to.code,
    routeLabel: priced.label,
    routeSlug: priced.routeSlug,
    tripDate: priced.travelDate,
    departureTime: priced.departureTime,
    returnDate: priced.returnDate,
    returnRouteSlug: priced.returnRouteSlug,
    returnDepartureTime: priced.returnDepartureTime,
    tripType: priced.tripType,
    passengers: priced.passengers,
    amount: priced.amount,
    name: data.name,
    email: data.email,
    phone: data.phone,
    outwardRunId: reservation.outwardRunId,
    returnRunId: reservation.returnRunId,
    inventoryStatus: "held",
  });
  if (!booking) {
    await releaseInventory(reservation.outwardRunId, reservation.returnRunId, priced.passengers);
    return { ok: false, message: "Couldn't start your booking. Please try again or call us." };
  }

  // Auto-create/link a customer account (email only) so the booking shows up in /account.
  await upsertCustomer(data.email, data.name);

  const settings = await getSettings();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? settings.url;

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      allow_promotion_codes: true,
      customer_email: data.email,
      line_items: [
        {
          quantity: priced.passengers,
          price_data: {
            currency: "gbp",
            unit_amount: priced.unitAmount,
            product_data: {
              name: `Daily Express: ${priced.label}`,
              description: `${priced.travelDate} at ${priced.departureTime}${priced.returnDate ? ` · return ${priced.returnDate} at ${priced.returnDepartureTime}` : ""} · ${priced.passengers} passenger${priced.passengers > 1 ? "s" : ""}`,
            },
          },
        },
      ],
      metadata: { kind: "booking", reference, route: priced.routeSlug, travel_date: priced.travelDate, trip_type: priced.tripType },
      payment_intent_data: { receipt_email: data.email, metadata: { kind: "booking", reference } },
      success_url: `${baseUrl}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/daily-express-service/book?cancelled=1`,
    });

    if (!session.url || !(await attachSession("bookings", booking.id, session.id))) {
      await getStripe().checkout.sessions.expire(session.id).catch(() => undefined);
      await failPendingOrder("bookings", booking.id);
      return { ok: false, message: "Couldn't safely start payment. No charge was taken; please try again." };
    }
    return { ok: true, redirect: session.url };
  } catch (err) {
    await failPendingOrder("bookings", booking.id);
    console.error("[stripe] booking checkout failed:", err);
    return { ok: false, message: "Couldn't open the payment page. Please try again or call us." };
  }
}

export async function startPassPurchase(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = lostPropertySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const data = parsed.data;

  const ip = await clientIp();
  if (await rateLimited(rateLimitKey("pass", ip), RATE_LIMITS.checkout)) {
    return { ok: false, message: "Too many attempts — please try again in 10 minutes." };
  }

  const token = formData.get("cf-turnstile-response");
  if (!(await verifyTurnstile(typeof token === "string" ? token : undefined, ip))) {
    return { ok: false, message: "Spam check failed — please try again." };
  }

  // Fee + VAT computed server-side from CMS pricing — never sent by the client.
  const priced = await priceLostPropertyPass();
  const reference = bookingReference();
  if (!process.env.STRIPE_SECRET_KEY) {
    return { ok: false, message: "Online payments are not available at the moment. Please call us to make your request." };
  }

  const record = await createPendingPassPurchase({
    reference,
    amount: priced.amount,
    name: data.name,
    email: data.email,
    phone: data.phone,
    travelDate: data.travelDate,
    travelTime: data.travelTime,
    schoolRoute: data.schoolRoute === "yes",
    school: data.school,
    route: data.route,
    whereLeft: data.whereLeft,
    itemDescription: data.itemDescription,
    notes: data.notes,
  });
  if (!record) return { ok: false, message: "Couldn't start your request. Please try again or call us." };

  // Auto-create/link a customer account so the claim shows up in /account.
  await upsertCustomer(data.email, data.name);

  const settings = await getSettings();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? settings.url;

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      allow_promotion_codes: true,
      customer_email: data.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "gbp",
            unit_amount: priced.amount,
            product_data: {
              name: "Lost Property reclaim admin fee",
              description: `Includes VAT @ ${priced.vatRate}%.`,
            },
          },
        },
      ],
      metadata: { kind: "pass", reference },
      payment_intent_data: { receipt_email: data.email, metadata: { kind: "pass", reference } },
      success_url: `${baseUrl}/pass/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/lost-property/claim?cancelled=1`,
    });

    if (!session.url || !(await attachSession("pass_purchases", record.id, session.id))) {
      await getStripe().checkout.sessions.expire(session.id).catch(() => undefined);
      await failPendingOrder("pass_purchases", record.id);
      return { ok: false, message: "Couldn't safely start payment. No charge was taken; please try again." };
    }
    return { ok: true, redirect: session.url };
  } catch {
    await failPendingOrder("pass_purchases", record.id);
    return { ok: false, message: "Couldn't open the payment page. Please try again or call us." };
  }
}
