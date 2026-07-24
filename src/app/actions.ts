"use server";

import { headers } from "next/headers";
import {
  contactSchema,
  bookingSchema,
  lostPropertySchema,
  fieldErrors,
  verifyTurnstile,
  rateLimited,
  createSubmission,
  type FormState,
} from "@/lib/forms";
import {
  stripeConfigured,
  getStripe,
  priceBooking,
  priceLostPropertyPass,
  bookingReference,
  createPendingBooking,
  createPendingPassPurchase,
  attachSession,
  markPaidByReference,
} from "@/lib/stripe";
import { upsertCustomer } from "@/lib/account";
import { getSettings } from "@/lib/directus";
import { sendEmail } from "@/lib/email";

async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0] : h.get("cf-connecting-ip"))?.trim() || "unknown";
}

export async function submitContact(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const data = parsed.data;

  const ip = await clientIp();
  if (rateLimited(`contact:${ip}`)) {
    return { ok: false, message: "Too many submissions — please try again in a minute." };
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

  return { ok: true, message: "Thanks — we've received your message and aim to reply within 24 hours." };
}

export async function startBooking(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = bookingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const data = parsed.data;

  const ip = await clientIp();
  if (rateLimited(`booking:${ip}`)) {
    return { ok: false, message: "Too many attempts — please try again in a minute." };
  }

  const token = formData.get("cf-turnstile-response");
  if (!(await verifyTurnstile(typeof token === "string" ? token : undefined, ip))) {
    return { ok: false, message: "Spam check failed — please try again." };
  }

  // Price is computed server-side from Directus — the client never sends an amount.
  const priced = await priceBooking(data.from, data.to, data.tripType, data.passengers);
  if (!priced) return { ok: false, message: "That journey or passenger count isn't available. Please check and try again." };

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

  // ponytail: dummy checkout — no Stripe keys, so mark paid and skip straight to the ticket.
  if (!stripeConfigured()) {
    await markPaidByReference("bookings", reference);
    return { ok: true, redirect: `${baseUrl}/booking/success?ref=${reference}` };
  }

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
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
      success_url: `${baseUrl}/booking/success?ref=${reference}`,
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
  if (rateLimited(`pass:${ip}`)) {
    return { ok: false, message: "Too many attempts — please try again in a minute." };
  }

  const token = formData.get("cf-turnstile-response");
  if (!(await verifyTurnstile(typeof token === "string" ? token : undefined, ip))) {
    return { ok: false, message: "Spam check failed — please try again." };
  }

  // Fee + VAT computed server-side from CMS pricing — never sent by the client.
  const priced = await priceLostPropertyPass();
  const reference = bookingReference();

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

  // Notify the lost-property team (no-ops gracefully until SMTP creds are set). ponytail:
  // fire-and-forget — a failed notification must not block the customer's checkout.
  void sendEmail({
    to: process.env.LOST_PROPERTY_TO ?? "info@np-coaches.co.uk",
    subject: `Lost property claim ${reference} — ${data.itemDescription.slice(0, 60)}`,
    text: [
      `Reference: ${reference}`,
      `Name: ${data.name}`,
      `Email: ${data.email}`,
      `Phone: ${data.phone}`,
      `Travel date: ${data.travelDate ?? "—"} ${data.travelTime ?? ""}`.trim(),
      data.schoolRoute === "yes" ? `School route: ${data.school ?? ""} ${data.route ?? ""}`.trim() : null,
      `Where left: ${data.whereLeft ?? "—"}`,
      `Item: ${data.itemDescription}`,
      data.notes ? `Notes: ${data.notes}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
  });

  const settings = await getSettings();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? settings.url;

  // ponytail: dummy checkout — no Stripe keys, so mark paid and skip straight to the receipt.
  if (!stripeConfigured()) {
    await markPaidByReference("pass_purchases", reference);
    return { ok: true, redirect: `${baseUrl}/pass/success?ref=${reference}` };
  }

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
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
      success_url: `${baseUrl}/pass/success?ref=${reference}`,
      cancel_url: `${baseUrl}/lost-property/claim?cancelled=1`,
    });

    if (!session.url) return { ok: false, message: "Couldn't open the payment page. Please try again." };
    await attachSession("pass_purchases", record.id, session.id);
    return { ok: true, redirect: session.url };
  } catch {
    return { ok: false, message: "Couldn't open the payment page. Please try again or call us." };
  }
}
