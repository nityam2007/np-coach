import crypto from "node:crypto";
import { cookies } from "next/headers";
import { directusServerRead, directusServerWrite } from "@/lib/directus-server";

const MAX_AGE = 60 * 60 * 24 * 7;

export function sessionCookieName(): string {
  return process.env.NODE_ENV === "production" ? "__Host-np_session" : "np_session";
}

export interface Session {
  email: string;
  exp: number;
}

function tokenHash(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Create an opaque, server-revocable session. No identity is exposed in the cookie. */
export async function createSession(email: string): Promise<void> {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + MAX_AGE * 1000);
  const created = await directusServerWrite("/items/customer_sessions", "POST", {
    token_hash: tokenHash(token),
    email: email.trim().toLowerCase(),
    expires_at: expiresAt.toISOString(),
    revoked_at: null,
  });
  if (created === null) throw new Error("Could not persist customer session");

  const store = await cookies();
  store.set(sessionCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
    priority: "high",
  });
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(sessionCookieName())?.value;
  if (!token || token.length < 40 || token.length > 64) return null;

  const now = new Date();
  const rows = await directusServerRead<Array<{ email: string; expires_at: string }>>(
    `/items/customer_sessions?filter[token_hash][_eq]=${tokenHash(token)}&filter[revoked_at][_null]=true&filter[expires_at][_gt]=${encodeURIComponent(now.toISOString())}&fields=email,expires_at&limit=2`,
  );
  if (!rows || rows.length !== 1) return null;
  const expiresAt = new Date(rows[0].expires_at).getTime();
  if (!Number.isFinite(expiresAt) || expiresAt <= now.getTime()) return null;
  return { email: rows[0].email, exp: Math.floor(expiresAt / 1000) };
}

/** Revoke the current opaque token before the route expires its cookie. */
export async function revokeSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(sessionCookieName())?.value;
  if (!token) return;
  await directusServerWrite(
    `/items/customer_sessions?filter[token_hash][_eq]=${tokenHash(token)}&filter[revoked_at][_null]=true&fields=id`,
    "PATCH",
    { revoked_at: new Date().toISOString() },
  );
}
