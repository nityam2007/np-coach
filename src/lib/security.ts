import crypto from "node:crypto";
import { headers } from "next/headers";
import { createClient } from "redis";

/**
 * Shared Redis rate limiting for Server Actions. The in-process limiter remains
 * as a fail-safe for local development or a temporary Redis outage.
 */
export interface RateLimitRule {
  limit: number;
  windowMs: number;
}

interface Bucket {
  hits: number[];
  expiresAt: number;
}

type RateRedisClient = ReturnType<typeof createClient>;

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;
const RATE_LIMIT_SCRIPT = `
  local hits = redis.call("INCR", KEYS[1])
  if hits == 1 then
    redis.call("PEXPIRE", KEYS[1], ARGV[1])
  end
  return hits
`;

const redisGlobal = globalThis as typeof globalThis & {
  npRateLimitRedis?: RateRedisClient;
  npRateLimitRedisConnect?: Promise<RateRedisClient | null>;
};

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

function memoryRateLimited(key: string, rule: RateLimitRule): boolean {
  const now = Date.now();
  sweepExpired(now);

  const cutoff = now - rule.windowMs;
  const recent = (buckets.get(key)?.hits ?? []).filter((timestamp) => timestamp > cutoff);
  recent.push(now);
  buckets.set(key, { hits: recent, expiresAt: now + rule.windowMs });
  return recent.length > rule.limit;
}

async function getRedisClient(): Promise<RateRedisClient | null> {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  if (redisGlobal.npRateLimitRedis?.isOpen) return redisGlobal.npRateLimitRedis;
  if (redisGlobal.npRateLimitRedisConnect) return redisGlobal.npRateLimitRedisConnect;

  const client =
    redisGlobal.npRateLimitRedis ??
    createClient({
      url,
      disableOfflineQueue: true,
      socket: {
        connectTimeout: 1_000,
        reconnectStrategy: (retries) => (retries > 2 ? false : Math.min(100 * 2 ** retries, 500)),
      },
    });

  if (!redisGlobal.npRateLimitRedis) {
    client.on("error", () => undefined);
    redisGlobal.npRateLimitRedis = client;
  }

  redisGlobal.npRateLimitRedisConnect = client
    .connect()
    .then(() => client)
    .catch(() => null)
    .finally(() => {
      redisGlobal.npRateLimitRedisConnect = undefined;
    });
  return redisGlobal.npRateLimitRedisConnect;
}

export async function rateLimited(key: string, rule: RateLimitRule): Promise<boolean> {
  const client = await getRedisClient();
  if (client) {
    try {
      const hits = await client.eval(RATE_LIMIT_SCRIPT, {
        keys: [`np:rate:${key}`],
        arguments: [String(rule.windowMs)],
      });
      return Number(hits) > rule.limit;
    } catch {
      // Fall through to the local fail-safe when Redis is temporarily unavailable.
    }
  }
  return memoryRateLimited(key, rule);
}

/** Hash identities before using them as limiter keys so email addresses are not retained. */
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
