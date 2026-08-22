import QRCode from "qrcode";
import type { BookingRow } from "@/lib/stripe";
import type { Stop } from "@/lib/site-config";

import { signTicket } from "@/lib/ticket-token";
/** Data the BoardingPass renders. Built server-side (includes a same-origin QR data URL). */
export interface BoardingPassData {
  siteName: string;
  reference: string;
  fromName: string;
  serviceName: string;
  departureTime: string;
  arrivalTime: string;
  returnLeg: null | {
    serviceName: string;
    date: string;
    departureTime: string;
    arrivalTime: string;
  };
  toName: string;
  date: string | null;
  tripType: string;
  passengers: number;
  passengerName: string;
  amountLabel?: string;
  qrDataUrl: string;
}

function gbp(pence: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}

/** Resolve stop names, format the fare, and render the QR (navy on white) for a paid booking. */
export async function boardingPassFromBooking(
  booking: BookingRow,
  stops: Stop[],
  siteName: string,
  siteUrl: string,
): Promise<BoardingPassData> {
  const fromName = stops.find((s) => s.code === booking.from_stop)?.name ?? booking.from_stop;
  const toName = stops.find((s) => s.code === booking.to_stop)?.name ?? booking.to_stop;
  const token = signTicket({
    reference: booking.reference,
    from: booking.from_stop,
    to: booking.to_stop,
    date: booking.trip_date,
    outwardService: booking.outward_service_code,
    returnService: booking.return_service_code,
    returnDate: booking.return_date,
  });
  const payload = `${siteUrl.replace(/\/$/, "")}/api/tickets/verify?token=${encodeURIComponent(token)}`;
  const qrDataUrl = await QRCode.toDataURL(payload, {
    margin: 1,
    width: 256,
    color: { dark: "#172554", light: "#ffffff" },
  });
  return {
    siteName,
    reference: booking.reference,
    fromName,
    serviceName: booking.journey_snapshot?.outward.serviceName ?? booking.outward_service_name ?? booking.route_label,
    departureTime: booking.journey_snapshot?.outward.departureTime ?? booking.departure_time ?? "—",
    arrivalTime: booking.journey_snapshot?.outward.arrivalTime ?? booking.arrival_time ?? "—",
    returnLeg: booking.journey_snapshot?.return ? {
      serviceName: booking.journey_snapshot.return.serviceName,
      date: booking.journey_snapshot.return.date,
      departureTime: booking.journey_snapshot.return.departureTime,
      arrivalTime: booking.journey_snapshot.return.arrivalTime,
    } : null,
    toName,
    date: booking.trip_date,
    tripType: booking.trip_type,
    passengers: booking.passengers,
    passengerName: booking.name,
    amountLabel: gbp(booking.amount),
    qrDataUrl,
  };
}
