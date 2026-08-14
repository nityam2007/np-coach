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
} from "@/lib/stripe";
import { upsertCustomer } from "@/lib/account";
import { getSettings } from "@/lib/directus";
import { sendContactNotifications, sendQuoteNotifications } from "@/lib/notifications";
import { clientIp, rateLimited, rateLimitKey, RATE_LIMITS } from "@/lib/security";


export async function submitContact(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const data = parsed.data;

  const ip = await clientIp();
  if (rateLimited(rateLimitKey("contact", ip), RATE_LIMITS.contact)) {
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
  const settings = await getSettings();
  await sendContactNotifications(settings, data).catch((error) => {
    console.error("[email] contact notifications failed", error);
  });

  return { ok: true, message: "Thanks — we've received your message and aim to reply within 24 hours." };
}

export async function submitQuote(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = quoteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const data = parsed.data;

  const ip = await clientIp();
  if (rateLimited(rateLimitKey("quote", ip), RATE_LIMITS.quote)) {
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
  const settings = await getSettings();
  await sendQuoteNotifications(settings, data).catch((error) => {
    console.error("[email] quote notifications failed", error);
  });
  return { ok: true, message: "Thanks — we have your quote request and will be in touch shortly." };
}

export async function startBooking(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = bookingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const data = parsed.data;

  const ip = await clientIp();
  if (rateLimited(rateLimitKey("booking", ip), RATE_LIMITS.checkout)) {
    return { ok: false, message: "Too many attempts — please try again in 10 minutes." };
  }

  const token = formData.get("cf-turnstile-response");
  if (!(await verifyTurnstile(typeof token === "string" ? token : undefined, ip))) {
    return { ok: false, message: "Spam check failed — please try again." };
  }

  // Price is computed server-side from Directus — the client never sends an amount.
  const priced = await priceBooking(data.from, data.to, data.tripType, data.passengers);
  if (!priced) return { ok: false, message: "That journey or passenger count isn't available. Please check and try again." };

  if (!process.env.STRIPE_SECRET_KEY) {
    return { ok: false, message: "Online payments are not available at the moment. Please call us to book." };
  }
  const reference = bookingReference();
  // Persist the booking as `pending` BEFORE payment (data-safety rule).
  const booking = await createPendingBooking({
    reference,
    fromStop: priced.from.code,
    toStop: priced.to.code,
    routeLabel: priced.label,
    tripDate: data.date,
    tripType: priced.tripType,
    passengers: priced.passengers,
    amount: priced.amount,
    name: data.name,
    email: data.email,
    phone: data.phone,
  });
  if (!booking) return { ok: false, message: "Couldn't start your booking. Please try again or call us." };

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
              description: `${data.date} · ${priced.passengers} passenger${priced.passengers > 1 ? "s" : ""}`,
            },
          },
        },
      ],
      metadata: { kind: "booking", reference, from: priced.from.code, to: priced.to.code, trip_type: priced.tripType },
      payment_intent_data: { receipt_email: data.email },
      success_url: `${baseUrl}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/daily-express-service/book?cancelled=1`,
    });

    if (!session.url) return { ok: false, message: "Couldn't open the payment page. Please try again." };
    await attachSession("bookings", booking.id, session.id);
    return { ok: true, redirect: session.url };
  } catch (err) {
    console.error("[stripe] booking checkout failed:", err);
    return { ok: false, message: "Couldn't open the payment page. Please try again or call us." };
  }
}

export async function startPassPurchase(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = lostPropertySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const data = parsed.data;

  const ip = await clientIp();
  if (rateLimited(rateLimitKey("pass", ip), RATE_LIMITS.checkout)) {
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
              description: `Includes VAT @ ${priced.vatRate}%. Item: ${data.itemDescription.slice(0, 80)}`,
            },
          },
        },
      ],
      metadata: { kind: "pass", reference },
      payment_intent_data: { receipt_email: data.email },
      success_url: `${baseUrl}/pass/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/lost-property/claim?cancelled=1`,
    });

    if (!session.url) return { ok: false, message: "Couldn't open the payment page. Please try again." };
    await attachSession("pass_purchases", record.id, session.id);
    return { ok: true, redirect: session.url };
  } catch {
    return { ok: false, message: "Couldn't open the payment page. Please try again or call us." };
  }
}
