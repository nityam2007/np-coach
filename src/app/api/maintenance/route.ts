import { NextResponse } from "next/server";
import { directusServerWrite } from "@/lib/directus-server";
import { retryLeadNotifications } from "@/lib/lead-delivery";
import { failStalePendingOrders } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorised(request: Request): boolean {
  const secret = process.env.MAINTENANCE_SECRET;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

/**
 * Hourly maintenance target for a Coolify cron job. Cleanup is independent of
 * customer login traffic and uses only the scoped Directus application token.
 */
export async function POST(request: Request) {
  if (!authorised(request)) return NextResponse.json({ error: "unauthorised" }, { status: 401 });

  const now = Date.now();
  const otpCutoff = encodeURIComponent(new Date(now - 24 * 60 * 60_000).toISOString());
  const sessionCutoff = encodeURIComponent(new Date(now).toISOString());
  const staleOrderCutoff = new Date(now - 24 * 60 * 60_000).toISOString();

  const results = await Promise.all([
    directusServerWrite(`/items/otp_codes?filter[created_at][_lt]=${otpCutoff}`, "DELETE"),
    directusServerWrite(`/items/customer_sessions?filter[expires_at][_lt]=${sessionCutoff}`, "DELETE"),
  ]);

  const leadsRetried = await retryLeadNotifications();
  const ordersCleaned = await failStalePendingOrders(staleOrderCutoff);
  if (!leadsRetried || !ordersCleaned || results.some((result) => result === null)) {
    return NextResponse.json({ error: "maintenance incomplete" }, { status: 503 });
  }
  return NextResponse.json({ ok: true, ranAt: new Date(now).toISOString() });
}
