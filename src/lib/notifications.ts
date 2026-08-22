import type { SiteSettings } from "./directus";
import { sendEmail, type EmailResult } from "./email";
import {
  bookingConfirmationEmail,
  contactCustomerEmail,
  contactStaffEmail,
  lostPropertyCustomerEmail,
  lostPropertyStaffEmail,
  quoteCustomerEmail,
  quoteStaffEmail,
  type BookingEmailData,
  type ContactEmailData,
  type PassEmailData,
  type QuoteEmailData,
} from "./email-templates";

async function deliver(label: string, message: Parameters<typeof sendEmail>[0]): Promise<EmailResult> {
  const result = await sendEmail(message);
  if (!result.delivered) console.error(`[email] ${label} was not delivered`);
  return result;
}

export async function sendContactNotifications(
  settings: SiteSettings,
  data: ContactEmailData,
  sourceId: number,
): Promise<boolean> {
  const staffTo = process.env.CONTACT_TO?.trim() || settings.email.general;
  const results = await Promise.all([
    deliver("contact acknowledgement", {
      ...contactCustomerEmail(settings, data),
      tracking: { idempotencyKey: `contact:${sourceId}:customer`, type: "contact_customer", sourceCollection: "contact_submissions", sourceId },
    }),
    deliver("contact staff notification", {
      ...contactStaffEmail(settings, data, staffTo),
      tracking: { idempotencyKey: `contact:${sourceId}:staff`, type: "contact_staff", sourceCollection: "contact_submissions", sourceId },
    }),
  ]);
  return results.every((result) => result.delivered);
}

export async function sendQuoteNotifications(
  settings: SiteSettings,
  data: QuoteEmailData,
  sourceId: number,
): Promise<boolean> {
  const staffTo = process.env.QUOTE_TO?.trim() || settings.email.general;
  const results = await Promise.all([
    deliver("quote acknowledgement", {
      ...quoteCustomerEmail(settings, data),
      tracking: { idempotencyKey: `quote:${sourceId}:customer`, type: "quote_customer", sourceCollection: "quote_requests", sourceId },
    }),
    deliver("quote staff notification", {
      ...quoteStaffEmail(settings, data, staffTo),
      tracking: { idempotencyKey: `quote:${sourceId}:staff`, type: "quote_staff", sourceCollection: "quote_requests", sourceId },
    }),
  ]);
  return results.every((result) => result.delivered);
}

export function sendBookingConfirmation(
  settings: SiteSettings,
  booking: BookingEmailData,
  siteUrl: string,
): Promise<EmailResult> {
  return deliver(
    `booking confirmation ${booking.reference}`,
    {
      ...bookingConfirmationEmail(settings, booking, siteUrl),
      tracking: { idempotencyKey: `booking:${booking.id}:customer`, type: "booking_confirmation", sourceCollection: "bookings", sourceId: booking.id, reference: booking.reference },
    },
  );
}

export function sendLostPropertyCustomerConfirmation(
  settings: SiteSettings,
  pass: PassEmailData,
): Promise<EmailResult> {
  return deliver(
    `lost-property customer confirmation ${pass.reference}`,
    {
      ...lostPropertyCustomerEmail(settings, pass),
      tracking: { idempotencyKey: `pass:${pass.id}:customer`, type: "lost_property_customer", sourceCollection: "pass_purchases", sourceId: pass.id, reference: pass.reference },
    },
  );
}

export function sendLostPropertyStaffNotification(
  settings: SiteSettings,
  pass: PassEmailData,
): Promise<EmailResult> {
  const staffTo = process.env.LOST_PROPERTY_TO?.trim() || settings.email.general;
  return deliver(
    `lost-property staff notification ${pass.reference}`,
    {
      ...lostPropertyStaffEmail(settings, pass, staffTo),
      tracking: { idempotencyKey: `pass:${pass.id}:staff`, type: "lost_property_staff", sourceCollection: "pass_purchases", sourceId: pass.id, reference: pass.reference },
    },
  );
}
