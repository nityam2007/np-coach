import { getSettings } from "@/lib/directus";
import { directusAtomicUpdate, directusServerRead } from "@/lib/directus-server";
import { sendContactNotifications, sendQuoteNotifications } from "@/lib/notifications";

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

async function claim(collection: LeadCollection, id: number): Promise<string | false | null> {
  const now = new Date();
  const lease = now.toISOString();
  const staleBefore = new Date(now.getTime() - 10 * 60_000).toISOString();
  const current = await directusServerRead<{
    email_status: string | null;
    email_started_at: string | null;
  }>(`/items/${collection}/${id}?fields=email_status,email_started_at`);
  if (!current) return null;

  const staleSending = current.email_status === "sending"
    && (!current.email_started_at || current.email_started_at < staleBefore);
  const eligible = current.email_status === null
    || current.email_status === "pending"
    || current.email_status === "failed"
    || staleSending;
  if (!eligible) return false;

  const updated = await directusAtomicUpdate(
    collection,
    id,
    {
      email_status: current.email_status,
      email_started_at: current.email_started_at,
    },
    { email_status: "sending", email_started_at: lease },
  );
  if (updated === null) return null;
  return updated ? lease : false;
}

export async function deliverLead(collection: LeadCollection, id: number): Promise<boolean> {
  const lease = await claim(collection, id);
  if (lease === null) return false;
  if (lease === false) return true;

  const settings = await getSettings();
  let delivered = false;
  if (collection === "contact_submissions") {
    const row = await directusServerRead<ContactRow>(`/items/${collection}/${id}`);
    if (row) delivered = await sendContactNotifications(settings, row, row.id);
  } else {
    const row = await directusServerRead<QuoteRow>(`/items/${collection}/${id}`);
    if (row) {
      delivered = await sendQuoteNotifications(settings, {
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
      }, row.id);
    }
  }

  const recorded = await directusAtomicUpdate(
    collection,
    id,
    { email_status: "sending", email_started_at: lease },
    {
      email_status: delivered ? "sent" : "failed",
      email_started_at: null,
      email_sent_at: delivered ? new Date().toISOString() : null,
    },
  );
  return delivered && recorded === true;
}

/** Retry a bounded batch from the protected maintenance endpoint. */
export async function retryLeadNotifications(limit = 20): Promise<boolean> {
  for (const collection of ["contact_submissions", "quote_requests"] as const) {
    const rows = await directusServerRead<Array<{ id: number }>>(
      `/items/${collection}?filter[email_status][_in]=pending,failed&fields=id&sort=created_at&limit=${limit}`,
    );
    if (rows === null) return false;
    for (const row of rows) await deliverLead(collection, row.id);
  }
  return true;
}
