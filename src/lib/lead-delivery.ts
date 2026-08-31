import { getSettings } from "@/lib/directus";
import {
  directusClaimEmailDelivery,
  directusFinishEmailDelivery,
  directusPendingLeadIds,
  type EmailDeliveryStatusField,
} from "@/lib/directus-server";
import type { EmailResult } from "@/lib/email";
import {
  sendContactCustomerNotification,
  sendContactStaffNotification,
  sendQuoteCustomerNotification,
  sendQuoteStaffNotification,
} from "@/lib/notifications";

type LeadCollection = "contact_submissions" | "quote_requests";

interface ContactRow {
  id: number;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

interface QuoteRow {
  id: number;
  name: string;
  email: string;
  phone: string;
  pickup: string;
  destination: string;
  outbound_date: string;
  return_date: string | null;
  passengers: number;
  coach_size: string;
  journey_details: string;
}

type LeadRow = ContactRow | QuoteRow;

async function deliverOnce(
  collection: LeadCollection,
  id: number,
  statusField: EmailDeliveryStatusField,
  send: (lead: LeadRow) => Promise<EmailResult>,
): Promise<boolean> {
  const now = new Date();
  const lease = now.toISOString();
  const claimed = await directusClaimEmailDelivery({
    collection,
    id,
    statusField,
    lease,
    staleBefore: new Date(now.getTime() - 10 * 60_000).toISOString(),
  });
  if (!claimed) return false;
  if (claimed.completed) return true;
  if (!claimed.claimed) return false;

  const lead = claimed.lead as unknown as LeadRow | undefined;
  if (!lead) {
    await directusFinishEmailDelivery({ collection, id, statusField, lease, delivered: false });
    return false;
  }

  let result: EmailResult;
  try {
    result = await send(lead);
  } catch (error) {
    console.error("[email] lead template/delivery failed", error);
    await directusFinishEmailDelivery({ collection, id, statusField, lease, delivered: false });
    return false;
  }

  const recorded = await directusFinishEmailDelivery({
    collection,
    id,
    statusField,
    lease,
    delivered: result.delivered,
  });
  return result.delivered && recorded;
}

export async function deliverLead(collection: LeadCollection, id: number): Promise<boolean> {
  const settings = await getSettings();
  if (collection === "contact_submissions") {
    const [customer, staff] = await Promise.all([
      deliverOnce(collection, id, "confirmation_email_status", (lead) =>
        sendContactCustomerNotification(settings, lead as ContactRow, id)),
      deliverOnce(collection, id, "staff_email_status", (lead) =>
        sendContactStaffNotification(settings, lead as ContactRow, id)),
    ]);
    return customer && staff;
  }

  const toQuoteData = (lead: LeadRow) => {
    const row = lead as QuoteRow;
    return {
      name: row.name,
      email: row.email,
      phone: row.phone,
      pickup: row.pickup,
      destination: row.destination,
      outboundDate: row.outbound_date,
      returnDate: row.return_date ?? "",
      passengers: row.passengers,
      coachSize: row.coach_size,
      journeyDetails: row.journey_details,
    };
  };
  const [customer, staff] = await Promise.all([
    deliverOnce(collection, id, "confirmation_email_status", (lead) =>
      sendQuoteCustomerNotification(settings, toQuoteData(lead), id)),
    deliverOnce(collection, id, "staff_email_status", (lead) =>
      sendQuoteStaffNotification(settings, toQuoteData(lead), id)),
  ]);
  return customer && staff;
}

/** Retry a bounded batch through the same private delivery path used at submit time. */
export async function retryLeadNotifications(limit = 20): Promise<boolean> {
  const targets = await directusPendingLeadIds(limit);
  if (!targets) return false;

  let complete = true;
  for (const collection of ["contact_submissions", "quote_requests"] as const) {
    for (const id of targets[collection]) {
      if (!(await deliverLead(collection, id))) complete = false;
    }
  }
  return complete;
}
