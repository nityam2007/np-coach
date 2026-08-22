import { NextResponse } from "next/server";
import { getBookingByReference } from "@/lib/stripe";
import { verifyTicket } from "@/lib/ticket-token";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (token.length > 2_000) return NextResponse.json({ valid: false }, { status: 400 });
  const claims = verifyTicket(token);
  if (!claims) return NextResponse.json({ valid: false }, { status: 400 });
  const booking = await getBookingByReference(claims.reference);
  const valid = Boolean(booking && booking.status === "paid"
    && booking.from_stop === claims.from && booking.to_stop === claims.to && booking.trip_date === claims.date
    && (!claims.outwardService || booking.outward_service_code === claims.outwardService)
    && (claims.returnService === undefined || booking.return_service_code === claims.returnService)
    && (claims.returnDate === undefined || booking.return_date === claims.returnDate));
  return NextResponse.json(valid ? { valid: true, reference: claims.reference, from: claims.from, to: claims.to, date: claims.date } : { valid: false }, { status: valid ? 200 : 404 });
}
