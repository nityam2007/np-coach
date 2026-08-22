import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { reconcilePaidOrder } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorised(request: Request): boolean {
  const configured = process.env.INTERNAL_API_SECRET ?? "";
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (configured.length < 32 || configured.length !== supplied.length) return false;
  return crypto.timingSafeEqual(Buffer.from(configured), Buffer.from(supplied));
}

export async function POST(request: Request) {
  if (!authorised(request)) return NextResponse.json({ error: "unauthorised" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  const { collection, id } = body as { collection?: unknown; id?: unknown };
  if ((collection !== "bookings" && collection !== "pass_purchases")
    || !Number.isInteger(id) || Number(id) < 1) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const reconciled = await reconcilePaidOrder(collection, Number(id));
  return reconciled
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "payment reconciliation incomplete" }, { status: 503 });
}