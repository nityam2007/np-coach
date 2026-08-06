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
): Promise<void> {
  const staffTo = process.env.CONTACT_TO?.trim() || settings.email.general;
  await Promise.all([
    deliver("contact acknowledgement", contactCustomerEmail(settings, data)),
    deliver("contact staff notification", contactStaffEmail(settings, data, staffTo)),
  ]);
}

export async function sendQuoteNotifications(
  settings: SiteSettings,
  data: QuoteEmailData,
): Promise<void> {
  const staffTo = process.env.QUOTE_TO?.trim() || settings.email.general;
  await Promise.all([
    deliver("quote acknowledgement", quoteCustomerEmail(settings, data)),
    deliver("quote staff notification", quoteStaffEmail(settings, data, staffTo)),
  ]);
}

export function sendBookingConfirmation(
  settings: SiteSettings,
  booking: BookingEmailData,
  siteUrl: string,
): Promise<EmailResult> {
  return deliver(
    `booking confirmation ${booking.reference}`,
    bookingConfirmationEmail(settings, booking, siteUrl),
  );
}

export function sendLostPropertyCustomerConfirmation(
  settings: SiteSettings,
  pass: PassEmailData,
): Promise<EmailResult> {
  return deliver(
    `lost-property customer confirmation ${pass.reference}`,
    lostPropertyCustomerEmail(settings, pass),
  );
}

export function sendLostPropertyStaffNotification(
  settings: SiteSettings,
  pass: PassEmailData,
): Promise<EmailResult> {
  const staffTo = process.env.LOST_PROPERTY_TO?.trim() || settings.email.general;
  return deliver(
    `lost-property staff notification ${pass.reference}`,
    lostPropertyStaffEmail(settings, pass, staffTo),
  );
}
