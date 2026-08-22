import type { EmailInput } from "./email";
import type { SiteSettings } from "./directus";
import type { EmailTemplateCopy } from "./site-config";

interface DetailRow {
  label: string;
  value: string | number | null | undefined;
}

interface TemplateOptions {
  copy: EmailTemplateCopy;
  variables?: Record<string, string | number>;
  rows?: DetailRow[];
  code?: string;
  ctaHref?: string;
  replyTo?: string;
  messageId?: string;
}

export interface ContactEmailData {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

export interface QuoteEmailData {
  name: string;
  email: string;
  phone: string;
  pickup: string;
  destination: string;
  outboundDate: string;
  returnDate: string;
  passengers: number;
  coachSize: string;
  journeyDetails: string;
}

export interface BookingEmailData {
  id: number;
  reference: string;
  route_label: string;
  trip_date: string | null;
  outward_service_name: string;
  departure_time: string;
  arrival_time: string;
  return_date: string | null;
  return_service_name: string | null;
  return_departure_time: string | null;
  return_arrival_time: string | null;
  journey_snapshot?: unknown;
  trip_type: string;
  passengers: number;
  amount: number;
  subtotal_amount?: number | null;
  discount_amount?: number | null;
  currency: string;
  name: string;
  email: string;
  phone: string;
}

export interface PassEmailData {
  id: number;
  reference: string;
  amount: number;
  subtotal_amount?: number | null;
  discount_amount?: number | null;
  currency: string;
  name: string;
  email: string;
  phone: string;
  travel_date: string | null;
  travel_time: string;
  school_route: boolean;
  school: string;
  route: string;
  where_left: string;
  item_description: string;
  notes: string;
}

const escapeHtml = (value: string | number) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

function interpolate(value: string, variables: Record<string, string | number>): string {
  return value.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match, key: string) =>
    Object.hasOwn(variables, key) ? String(variables[key]) : match,
  );
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "Not provided";
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(date);
}

function formatMoney(amount: number, currency = "gbp"): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function issuedBookingAmount(snapshot: unknown): number | null {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot) || !("amount" in snapshot)) return null;
  const amount = (snapshot as { amount?: unknown }).amount;
  return Number.isInteger(amount) && Number(amount) >= 0 ? Number(amount) : null;
}

function messageId(kind: string, key: string, settings: SiteSettings): string {
  const emailHost = settings.email.general.split("@").at(-1)?.trim().toLowerCase();
  const host = emailHost && /^[a-z0-9.-]+$/.test(emailHost) ? emailHost : "localhost";
  const safe = `${kind}-${key}`.toLowerCase().replace(/[^a-z0-9._-]/g, "-");
  return `<${safe}@${host}>`;
}

function buildEmail(settings: SiteSettings, to: string, options: TemplateOptions): EmailInput {
  const variables = { siteName: settings.name, ...(options.variables ?? {}) };
  const subject = interpolate(options.copy.subject, variables);
  const eyebrow = interpolate(options.copy.eyebrow, variables);
  const heading = interpolate(options.copy.heading, variables);
  const intro = interpolate(options.copy.intro, variables);
  const footer = interpolate(options.copy.footer, variables);
  const rows = (options.rows ?? []).filter(
    (row) => row.value !== null && row.value !== undefined && row.value !== "",
  );

  const rowsHtml = rows.length
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0;border-collapse:collapse;border:1px solid #dbe3f3;border-radius:12px;overflow:hidden">${rows
        .map(
          ({ label, value }, index) =>
            `<tr style="background:${index % 2 ? "#ffffff" : "#f8faff"}"><th align="left" style="padding:12px 14px;color:#172554;font:600 13px Arial,sans-serif;border-bottom:1px solid #e8eefb;width:38%">${escapeHtml(label)}</th><td style="padding:12px 14px;color:#334155;font:400 14px/1.5 Arial,sans-serif;border-bottom:1px solid #e8eefb">${escapeHtml(value!).replaceAll("\n", "<br>")}</td></tr>`,
        )
        .join("")}</table>`
    : "";

  const codeHtml = options.code
    ? `<div style="margin:26px 0;padding:20px;text-align:center;border-radius:14px;background:#f2f5fb;color:#172554;font:700 32px/1 Arial,sans-serif;letter-spacing:8px">${escapeHtml(options.code)}</div>`
    : "";

  const ctaLabel = options.copy.ctaLabel ? interpolate(options.copy.ctaLabel, variables) : "";
  const ctaHtml =
    options.ctaHref && ctaLabel
      ? `<p style="margin:28px 0 8px"><a href="${escapeHtml(options.ctaHref)}" style="display:inline-block;padding:13px 20px;border-radius:10px;background:#2563eb;color:#ffffff;text-decoration:none;font:700 14px Arial,sans-serif">${escapeHtml(ctaLabel)}</a></p>`
      : "";

  const address = [
    settings.address.line1,
    settings.address.line2,
    settings.address.city,
    settings.address.postcode,
  ]
    .filter(Boolean)
    .join(", ");

  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f2f5fb"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f2f5fb"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(23,37,84,.08)"><tr><td style="padding:24px 30px;background:#172554;color:#ffffff"><div style="font:700 22px Arial,sans-serif">${escapeHtml(settings.name)}</div><div style="margin-top:5px;color:#cbd5e1;font:400 13px Arial,sans-serif">${escapeHtml(settings.tagline)}</div></td></tr><tr><td style="padding:34px 30px"><div style="color:#2563eb;font:700 12px Arial,sans-serif;letter-spacing:1.5px;text-transform:uppercase">${escapeHtml(eyebrow)}</div><h1 style="margin:10px 0 14px;color:#172554;font:700 28px/1.2 Arial,sans-serif">${escapeHtml(heading)}</h1><p style="margin:0;color:#475569;font:400 15px/1.7 Arial,sans-serif">${escapeHtml(intro)}</p>${codeHtml}${rowsHtml}${ctaHtml}<p style="margin:26px 0 0;color:#64748b;font:400 13px/1.6 Arial,sans-serif">${escapeHtml(footer)}</p></td></tr><tr><td style="padding:20px 30px;background:#172554;color:#cbd5e1;font:400 12px/1.6 Arial,sans-serif"><strong style="color:#ffffff">${escapeHtml(settings.legalName)}</strong><br>${escapeHtml(address)}<br><a href="${escapeHtml(settings.phone.href)}" style="color:#ffffff">${escapeHtml(settings.phone.display)}</a> · <a href="mailto:${escapeHtml(settings.email.general)}" style="color:#ffffff">${escapeHtml(settings.email.general)}</a></td></tr></table></td></tr></table></body></html>`;

  const textRows = rows.map(({ label, value }) => `${label}: ${value}`).join("\n");
  const text = [
    heading,
    intro,
    options.code ? `Code: ${options.code}` : "",
    textRows,
    options.ctaHref ? `${ctaLabel}: ${options.ctaHref}` : "",
    footer,
    `${settings.legalName} · ${address} · ${settings.phone.display}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    to,
    subject,
    text,
    html,
    replyTo: options.replyTo,
    messageId: options.messageId,
  };
}

export function otpEmail(settings: SiteSettings, to: string, code: string): EmailInput {
  return buildEmail(settings, to, { copy: settings.emailTemplates.otp, code });
}

export function bookingConfirmationEmail(
  settings: SiteSettings,
  booking: BookingEmailData,
  siteUrl: string,
): EmailInput {
  const subtotal = booking.subtotal_amount ?? issuedBookingAmount(booking.journey_snapshot) ?? booking.amount;
  const discount = booking.discount_amount ?? Math.max(0, subtotal - booking.amount);
  return buildEmail(settings, booking.email, {
    copy: settings.emailTemplates.bookingConfirmation,
    variables: { reference: booking.reference, name: booking.name },
    rows: [
      { label: "Booking reference", value: booking.reference },
      { label: "Journey", value: booking.route_label },
      { label: "Travel date", value: formatDate(booking.trip_date) },
      { label: "Outward service", value: booking.outward_service_name },
      { label: "Outward time", value: `${booking.departure_time}–${booking.arrival_time}` },
      { label: "Return date", value: booking.return_date ? formatDate(booking.return_date) : null },
      { label: "Return service", value: booking.return_service_name },
      { label: "Return time", value: booking.return_departure_time && booking.return_arrival_time
        ? `${booking.return_departure_time}–${booking.return_arrival_time}`
        : null },
      { label: "Ticket", value: booking.trip_type === "return" ? "Return" : "Single" },
      { label: "Passengers", value: booking.passengers },
      { label: "Fare", value: formatMoney(subtotal, booking.currency) },
      { label: "Promotion discount", value: discount > 0 ? `−${formatMoney(discount, booking.currency)}` : null },
      { label: "Paid", value: formatMoney(booking.amount, booking.currency) },
    ],
    ctaHref: `${siteUrl.replace(/\/$/, "")}/account/login`,
    messageId: messageId("booking", booking.reference, settings),
  });
}

export function bookingStaffEmail(
  settings: SiteSettings,
  booking: BookingEmailData,
  to: string,
): EmailInput {
  const subtotal = booking.subtotal_amount ?? issuedBookingAmount(booking.journey_snapshot) ?? booking.amount;
  const discount = booking.discount_amount ?? Math.max(0, subtotal - booking.amount);
  return buildEmail(settings, to, {
    copy: settings.emailTemplates.bookingStaff,
    variables: { reference: booking.reference, name: booking.name },
    rows: [
      { label: "Booking reference", value: booking.reference },
      { label: "Customer", value: booking.name },
      { label: "Email", value: booking.email },
      { label: "Phone", value: booking.phone },
      { label: "Journey", value: booking.route_label },
      { label: "Travel date", value: formatDate(booking.trip_date) },
      { label: "Outward service", value: booking.outward_service_name },
      { label: "Outward time", value: `${booking.departure_time}–${booking.arrival_time}` },
      { label: "Return date", value: booking.return_date ? formatDate(booking.return_date) : null },
      { label: "Return service", value: booking.return_service_name },
      { label: "Return time", value: booking.return_departure_time && booking.return_arrival_time
        ? `${booking.return_departure_time}–${booking.return_arrival_time}`
        : null },
      { label: "Ticket", value: booking.trip_type === "return" ? "Return" : "Single" },
      { label: "Passengers", value: booking.passengers },
      { label: "Fare", value: formatMoney(subtotal, booking.currency) },
      { label: "Promotion discount", value: discount > 0 ? `−${formatMoney(discount, booking.currency)}` : null },
      { label: "Paid", value: formatMoney(booking.amount, booking.currency) },
    ],
    replyTo: booking.email,
    messageId: messageId("booking-staff", booking.reference, settings),
  });
}

export function lostPropertyCustomerEmail(settings: SiteSettings, pass: PassEmailData): EmailInput {
  const subtotal = pass.subtotal_amount ?? pass.amount;
  const discount = pass.discount_amount ?? Math.max(0, subtotal - pass.amount);
  return buildEmail(settings, pass.email, {
    copy: settings.emailTemplates.lostPropertyCustomer,
    variables: { reference: pass.reference, name: pass.name },
    rows: [
      { label: "Reference", value: pass.reference },
      { label: "Item", value: pass.item_description },
      { label: "Travel date", value: formatDate(pass.travel_date) },
      { label: "Travel time", value: pass.travel_time },
      { label: "Where it was left", value: pass.where_left },
      { label: "Fee", value: formatMoney(subtotal, pass.currency) },
      { label: "Promotion discount", value: discount > 0 ? `−${formatMoney(discount, pass.currency)}` : null },
      { label: "Paid", value: formatMoney(pass.amount, pass.currency) },
    ],
    messageId: messageId("lost-property-customer", pass.reference, settings),
  });
}

export function lostPropertyStaffEmail(
  settings: SiteSettings,
  pass: PassEmailData,
  to: string,
): EmailInput {
  return buildEmail(settings, to, {
    copy: settings.emailTemplates.lostPropertyStaff,
    variables: { reference: pass.reference, name: pass.name },
    rows: [
      { label: "Reference", value: pass.reference },
      { label: "Customer", value: pass.name },
      { label: "Email", value: pass.email },
      { label: "Phone", value: pass.phone },
      { label: "Item", value: pass.item_description },
      { label: "Travel date", value: formatDate(pass.travel_date) },
      { label: "Travel time", value: pass.travel_time },
      { label: "School route", value: pass.school_route ? "Yes" : "No" },
      { label: "School", value: pass.school },
      { label: "Route", value: pass.route },
      { label: "Where left", value: pass.where_left },
      { label: "Notes", value: pass.notes },
    ],
    replyTo: pass.email,
    messageId: messageId("lost-property-staff", pass.reference, settings),
  });
}

export function contactCustomerEmail(settings: SiteSettings, data: ContactEmailData): EmailInput {
  return buildEmail(settings, data.email, {
    copy: settings.emailTemplates.contactCustomer,
    variables: { name: data.name, subject: data.subject },
    rows: [{ label: "Subject", value: data.subject }],
  });
}

export function contactStaffEmail(
  settings: SiteSettings,
  data: ContactEmailData,
  to: string,
): EmailInput {
  return buildEmail(settings, to, {
    copy: settings.emailTemplates.contactStaff,
    variables: { name: data.name, subject: data.subject },
    rows: [
      { label: "Name", value: data.name },
      { label: "Email", value: data.email },
      { label: "Phone", value: data.phone },
      { label: "Subject", value: data.subject },
      { label: "Message", value: data.message },
    ],
    replyTo: data.email,
  });
}

export function quoteCustomerEmail(settings: SiteSettings, data: QuoteEmailData): EmailInput {
  return buildEmail(settings, data.email, {
    copy: settings.emailTemplates.quoteCustomer,
    variables: { name: data.name },
    rows: [
      { label: "Journey", value: `${data.pickup} to ${data.destination}` },
      { label: "Outbound", value: formatDate(data.outboundDate) },
      { label: "Passengers", value: data.passengers },
    ],
  });
}

export function quoteStaffEmail(
  settings: SiteSettings,
  data: QuoteEmailData,
  to: string,
): EmailInput {
  return buildEmail(settings, to, {
    copy: settings.emailTemplates.quoteStaff,
    variables: { name: data.name },
    rows: [
      { label: "Name", value: data.name },
      { label: "Email", value: data.email },
      { label: "Phone", value: data.phone },
      { label: "Pickup", value: data.pickup },
      { label: "Destination", value: data.destination },
      { label: "Outbound", value: formatDate(data.outboundDate) },
      { label: "Return", value: data.returnDate ? formatDate(data.returnDate) : "One way" },
      { label: "Passengers", value: data.passengers },
      { label: "Coach size", value: data.coachSize },
      { label: "Journey details", value: data.journeyDetails },
    ],
    replyTo: data.email,
  });
}
