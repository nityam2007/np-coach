import crypto from "node:crypto";
import { headers } from "next/headers";

/**
 * Small, per-process rate limiter for the single Next.js container used in
 * production. Cloudflare remains the outer/WAF layer; this is the application
 * backstop for Server Actions.
 */
export interface RateLimitRule {
  limit: number;
  windowMs: number;
}

interface Bucket {
  hits: number[];
  expiresAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

export const RATE_LIMITS = {
  contact: { limit: 3, windowMs: 10 * 60_000 },
  quote: { limit: 3, windowMs: 10 * 60_000 },
  checkout: { limit: 5, windowMs: 10 * 60_000 },
  otpRequest: { limit: 3, windowMs: 15 * 60_000 },
  otpVerify: { limit: 10, windowMs: 15 * 60_000 },
} satisfies Record<string, RateLimitRule>;

function sweepExpired(now: number): void {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.expiresAt <= now) buckets.delete(key);
  }
}

export function rateLimited(key: string, rule: RateLimitRule): boolean {
  const now = Date.now();
  sweepExpired(now);

  const cutoff = now - rule.windowMs;
  const recent = (buckets.get(key)?.hits ?? []).filter((timestamp) => timestamp > cutoff);
  recent.push(now);
  buckets.set(key, { hits: recent, expiresAt: now + rule.windowMs });
  return recent.length > rule.limit;
}

/** Hash identities before using them as in-memory keys so email addresses are not retained. */
export function rateLimitKey(scope: string, identity: string): string {
  const digest = crypto.createHash("sha256").update(identity.trim().toLowerCase()).digest("base64url");
  return `${scope}:${digest}`;
}

/**
 * Resolve the client IP behind Cloudflare/Traefik. Cloudflare's dedicated header
 * is preferred; forwarded headers are only fallbacks for local/review setups.
 */
export async function clientIp(): Promise<string> {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const value =
    requestHeaders.get("cf-connecting-ip")?.trim() ||
    requestHeaders.get("x-real-ip")?.trim() ||
    forwarded ||
    "unknown";
  return value.slice(0, 64);
}
