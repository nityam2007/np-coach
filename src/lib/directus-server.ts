/**
 * Authenticated, server-only Directus access. Used for collections the public can
 * neither read nor write (bookings, pass purchases, customers, OTP codes). Uses the
 * scoped DIRECTUS_SERVER_TOKEN in production; in local dev it falls back to an admin
 * login (same creds the seed uses), cached until shortly before the token expires.
 *
 * NEVER import this into a client component — it can mint an admin session.
 */

const DIRECTUS_URL = process.env.DIRECTUS_URL ?? "http://localhost:8055";

let cached: { token: string; expiresAt: number } | null = null;

export async function directusServerToken(): Promise<string | null> {
  const fixed = process.env.DIRECTUS_SERVER_TOKEN;
  if (fixed) return fixed;
  if (cached && cached.expiresAt > Date.now()) return cached.token;

  const email = process.env.DIRECTUS_ADMIN_EMAIL ?? "admin@np-coaches.co.uk";
  const password = process.env.DIRECTUS_ADMIN_PASSWORD ?? "change-me";
  try {
    const res = await fetch(`${DIRECTUS_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data: { access_token: string; expires: number } };
    cached = { token: json.data.access_token, expiresAt: Date.now() + Math.max(0, json.data.expires - 60_000) };
    return cached.token;
  } catch {
    return null;
  }
}

/** GET an item/collection path, returning the `data` payload (or null on any failure). */
export async function directusServerRead<T>(path: string): Promise<T | null> {
  const token = await directusServerToken();
  if (!token) return null;
  try {
    const res = await fetch(`${DIRECTUS_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data: T };
    return json.data;
  } catch {
    return null;
  }
}

/** POST/PATCH/DELETE, returning the `data` payload (or null on any failure). */
export async function directusServerWrite(
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<unknown | null> {
  const token = await directusServerToken();
  if (!token) return null;
  try {
    const res = await fetch(`${DIRECTUS_URL}${path}`, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text ? ((JSON.parse(text) as { data?: unknown }).data ?? null) : null;
  } catch {
    return null;
  }
}

type InternalRequestResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number | null };

async function internalRequestResult<T>(path: string, body: unknown): Promise<InternalRequestResult<T>> {
  const token = await directusServerToken();
  const secret = process.env.INTERNAL_API_SECRET;
  if (!token || !secret) return { ok: false, status: null };
  try {
    const res = await fetch(DIRECTUS_URL + "/np-internal" + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
        "X-Internal-API-Secret": secret,
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return { ok: false, status: res.status };
    const json = (await res.json()) as { data: T };
    return { ok: true, data: json.data };
  } catch {
    return { ok: false, status: null };
  }
}

async function internalRequest<T>(path: string, body: unknown): Promise<T | null> {
  const result = await internalRequestResult<T>(path, body);
  return result.ok ? result.data : null;
}

/** A SQL-level conditional update performed inside Directus. */
export async function directusAtomicUpdate(
  collection: string,
  id: number,
  expected: Record<string, unknown>,
  changes: Record<string, unknown>,
): Promise<boolean | null> {
  const result = await internalRequest<{ updated: boolean }>("/cas", { collection, id, expected, changes });
  return result?.updated ?? (result === null ? null : false);
}

export interface AtomicInventoryRun {
  routeSlug: string;
  serviceCode: string;
  serviceDate: string;
  departureTime: string;
  capacity: number;
}

export interface PaidBookingInventoryCommit {
  bookingId: number;
  sessionId: string;
  paymentIntent: string | null;
  amountTotal: number | null;
  runs: AtomicInventoryRun[];
  seats: number;
}

export type DirectusPaidBookingCommitResult =
  | { ok: true; reference: string; runIds: number[] }
  | { ok: false; reason: "capacity" | "unavailable" };

export async function directusCommitPaidBookingInventory(
  commit: PaidBookingInventoryCommit,
): Promise<DirectusPaidBookingCommitResult> {
  const result = await internalRequestResult<{ reference: string; runIds: number[] }>(
    "/inventory/commit-paid-booking",
    commit,
  );
  if (!result.ok) {
    return { ok: false, reason: result.status === 409 ? "capacity" : "unavailable" };
  }
  return { ok: true, reference: result.data.reference, runIds: result.data.runIds };
}

export async function directusReconcilePaidBookingInventory(
  bookingId: number,
  runs: AtomicInventoryRun[],
  seats: number,
): Promise<DirectusPaidBookingCommitResult> {
  const result = await internalRequestResult<{ reference: string; runIds: number[] }>(
    "/inventory/reconcile-paid-booking",
    { bookingId, runs, seats },
  );
  if (!result.ok) {
    return { ok: false, reason: result.status === 409 ? "capacity" : "unavailable" };
  }
  return { ok: true, reference: result.data.reference, runIds: result.data.runIds };
}

export async function directusInventoryReady(): Promise<boolean> {
  const result = await internalRequestResult<{ ready: boolean }>("/inventory/status", {});
  return result.ok && result.data.ready === true;
}

export async function directusReleaseInventory(runIds: number[], seats: number): Promise<boolean> {
  if (runIds.length === 0) return true;
  const result = await internalRequest<{ released: boolean }>("/inventory/release", { runIds, seats });
  return result?.released === true;
}
