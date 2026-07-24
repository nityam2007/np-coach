import { cookies } from "next/headers";
import crypto from "node:crypto";

/**
 * Passwordless customer session. The session is a stateless, HMAC-signed cookie
 * (payload.signature); tampering invalidates the signature. Set only from Server
 * Actions / Route Handlers (createSession/destroySession); read anywhere (getSession).
 *
 * AUTH_SECRET must be set in production — a warning is logged if it isn't.
 */

const COOKIE = "np_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days (seconds)

if (process.env.NODE_ENV === "production" && !process.env.AUTH_SECRET) {
  console.warn("[auth] AUTH_SECRET is not set — set a strong secret in production.");
}

function secret(): string {
  return process.env.AUTH_SECRET ?? "np-coaches-dev-only-secret-change-me";
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

export interface Session {
  email: string;
  exp: number; // unix seconds
}

export async function createSession(email: string): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const payload = Buffer.from(JSON.stringify({ email: email.trim().toLowerCase(), exp })).toString("base64url");
  const token = `${payload}.${sign(payload)}`;
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;

  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as Session;
    if (!data.email || typeof data.exp !== "number" || data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}
