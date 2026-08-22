import crypto from "node:crypto";
import { directusAtomicUpdate, directusServerRead, directusServerWrite } from "@/lib/directus-server";
import { sendEmail } from "@/lib/email";
import { otpEmail } from "@/lib/email-templates";
import type { SiteSettings } from "@/lib/directus";
import type { BookingRow, PassPurchaseRow } from "@/lib/stripe";

/**
 * Customer accounts (passwordless). Customers are identified by email only; a record
 * is created on first login or at checkout. Login uses a short-lived, single-use,
 * hashed OTP. All access here uses the server-only Directus token — these collections
 * are never publicly readable/writable.
 */

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const OTP_MAX_ATTEMPTS = 5;
const OTP_RETENTION_MS = 24 * 60 * 60 * 1000; // purge otp rows older than this (TTL is 10 min)

const normalise = (email: string) => email.trim().toLowerCase();

/** OTP hash is bound to the email so a code can't be replayed against another account. */
function otpPepper(): string {
  const value = process.env.OTP_PEPPER || process.env.AUTH_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === "production") throw new Error("OTP_PEPPER or AUTH_SECRET must be configured");
  return "np-coaches-dev-otp-pepper";
}

function hashCode(email: string, code: string): string {
  return crypto.createHmac("sha256", otpPepper()).update(`${normalise(email)}:${code}`).digest("hex");
}

export interface Customer {
  id: number;
  email: string;
  name: string | null;
}

/** Find or create a customer by email (case-insensitive). Backfills the name if newly known. */
export async function upsertCustomer(email: string, name?: string): Promise<Customer | null> {
  const e = normalise(email);
  const existing = await directusServerRead<Customer[]>(
    `/items/customers?filter[email][_eq]=${encodeURIComponent(e)}&limit=1`,
  );
  if (existing && existing[0]) {
    if (name && !existing[0].name) {
      await directusServerWrite(`/items/customers/${existing[0].id}`, "PATCH", { name });
    }
    return existing[0];
  }
  const created = await directusServerWrite("/items/customers", "POST", { email: e, name: name ?? null });
  return (created as Customer) ?? null;
}

/**
 * Create a 6-digit OTP for an email, invalidate any prior unconsumed codes, and email
 * it. Returns { ok }. In dev with no SMTP configured, returns the code so the login
 * flow is testable — NEVER in production.
 */
/**
 * Purge OTP rows older than the retention window (consumed or not — anything this old is
 * long past its 10-min TTL). ponytail: opportunistic sweep on login request rather than a
 * cron — the table only grows on login attempts, so cleaning up there keeps it self-bounded.
 */
async function sweepOldOtps(): Promise<void> {
  // Delete rows whose expiry is more than the retention window in the past (their 10-min
  // TTL is long gone). `expires_at` always exists; `created_at` ≈ expires_at − 10 min.
  const cutoff = new Date(Date.now() - OTP_RETENTION_MS).toISOString();
  const stale = await directusServerRead<Array<{ id: number }>>(
    `/items/otp_codes?filter[expires_at][_lt]=${encodeURIComponent(cutoff)}&fields=id&limit=-1`,
  );
  if (stale?.length) await directusServerWrite("/items/otp_codes", "DELETE", stale.map((r) => r.id));
}

export async function createAndSendOtp(
  email: string,
  settings: SiteSettings,
): Promise<{ ok: boolean; devCode?: string }> {
  const e = normalise(email);
  await upsertCustomer(e);
  await sweepOldOtps();

  // Invalidate previous unconsumed codes for this email.
  const prior = await directusServerRead<Array<{ id: number }>>(
    `/items/otp_codes?filter[email][_eq]=${encodeURIComponent(e)}&filter[consumed][_eq]=false&fields=id&limit=-1`,
  );
  if (prior) for (const p of prior) await directusServerWrite(`/items/otp_codes/${p.id}`, "PATCH", { consumed: true });

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  const row = (await directusServerWrite("/items/otp_codes", "POST", {
    email: e,
    code_hash: hashCode(e, code),
    expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
    consumed: false,
    attempts: 0,
  })) as { id: number } | null;
  if (!row) return { ok: false };

  const result = await sendEmail(otpEmail(settings, e, code));
  if (!result.ok || (!result.delivered && process.env.NODE_ENV === "production")) {
    await directusServerWrite(`/items/otp_codes/${row.id}`, "PATCH", { consumed: true });
    return { ok: false };
  }

  const devCode = !result.delivered && process.env.NODE_ENV !== "production" ? code : undefined;
  return { ok: true, devCode };
}

/** Verify an OTP for an email: single-use, expiry- and attempt-limited, constant-time. */
export async function verifyOtp(email: string, code: string): Promise<boolean> {
  const e = normalise(email);
  if (!/^\d{6}$/.test(code)) return false;

  const rows = await directusServerRead<
    Array<{ id: number; code_hash: string; expires_at: string; consumed: boolean; attempts: number }>
  >(`/items/otp_codes?filter[email][_eq]=${encodeURIComponent(e)}&filter[consumed][_eq]=false&sort=-id&limit=1`);
  const row = rows?.[0];
  if (!row) return false;

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await directusServerWrite(`/items/otp_codes/${row.id}`, "PATCH", { consumed: true });
    return false;
  }
  if (row.attempts >= OTP_MAX_ATTEMPTS) {
    await directusServerWrite(`/items/otp_codes/${row.id}`, "PATCH", { consumed: true });
    return false;
  }

  const expected = hashCode(e, code);
  const a = Buffer.from(row.code_hash);
  const b = Buffer.from(expected);
  const match = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!match) {
    const attempts = row.attempts + 1;
    await directusAtomicUpdate(
      "otp_codes",
      row.id,
      { consumed: false, attempts: row.attempts },
      { attempts, ...(attempts >= OTP_MAX_ATTEMPTS ? { consumed: true } : {}) },
    );
    return false;
  }

  const consumed = await directusAtomicUpdate(
    "otp_codes",
    row.id,
    {
      consumed: false,
      code_hash: expected,
      expires_at: row.expires_at,
      attempts: row.attempts,
    },
    { consumed: true },
  );
  await upsertCustomer(e);
  return true;
}

/** A customer's paid bookings (tickets), newest first. */
export async function getCustomerBookings(email: string): Promise<BookingRow[]> {
  const e = normalise(email);
  const rows = await directusServerRead<BookingRow[]>(
    `/items/bookings?filter[email][_eq]=${encodeURIComponent(e)}&filter[status][_eq]=paid&sort=-id&limit=100`,
  );
  return rows ?? [];
}

/** A customer's lost-property claims (any status), newest first. */
export async function getCustomerPasses(email: string): Promise<PassPurchaseRow[]> {
  const e = normalise(email);
  const rows = await directusServerRead<PassPurchaseRow[]>(
    `/items/pass_purchases?filter[email][_eq]=${encodeURIComponent(e)}&sort=-id&limit=100`,
  );
  return rows ?? [];
}
