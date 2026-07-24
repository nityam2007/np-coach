import QRCode from "qrcode";
import type { BookingRow } from "@/lib/stripe";
import type { Stop } from "@/lib/site-config";

/** Data the BoardingPass renders. Built server-side (includes a same-origin QR data URL). */
export interface BoardingPassData {
  siteName: string;
  reference: string;
  fromName: string;
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
): Promise<BoardingPassData> {
  const fromName = stops.find((s) => s.code === booking.from_stop)?.name ?? booking.from_stop;
  const toName = stops.find((s) => s.code === booking.to_stop)?.name ?? booking.to_stop;
  const payload = `NP-COACHES|${booking.reference}|${booking.from_stop}->${booking.to_stop}|${booking.trip_date ?? ""}`;
  const qrDataUrl = await QRCode.toDataURL(payload, {
    margin: 1,
    width: 256,
    color: { dark: "#172554", light: "#ffffff" },
  });
  return {
    siteName,
    reference: booking.reference,
    fromName,
    toName,
    date: booking.trip_date,
    tripType: booking.trip_type,
    passengers: booking.passengers,
    passengerName: booking.name,
    amountLabel: gbp(booking.amount),
    qrDataUrl,
  };
}
