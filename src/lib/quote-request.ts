export interface QuoteRequestInput {
  name: string;
  email: string;
  phone: string;
  pickup: string;
  destination: string;
  outboundDate: string;
  returnDate: string;
  passengers: number;
  coachSize: string;
  journeyDetails: string;
}

export interface StoredQuoteRequest {
  id?: number;
  name: string;
  email: string;
  phone: string;
  trip_from: string;
  trip_to: string;
  trip_date: string;
  return_date: string | null;
  passengers: number;
  coach_size: string;
  message: string;
}

/** Map the public quote form onto the established production Directus schema. */
export function quoteRequestRecord(data: QuoteRequestInput): Omit<StoredQuoteRequest, "id"> {
  return {
    name: data.name,
    email: data.email,
    phone: data.phone,
    trip_from: data.pickup,
    trip_to: data.destination,
    trip_date: data.outboundDate,
    return_date: data.returnDate || null,
    passengers: data.passengers,
    coach_size: data.coachSize,
    message: data.journeyDetails,
  };
}

/** Convert the persisted record into the camel-case shape used by email templates. */
export function quoteRequestEmailData(row: StoredQuoteRequest): QuoteRequestInput {
  return {
    name: row.name,
    email: row.email,
    phone: row.phone,
    pickup: row.trip_from,
    destination: row.trip_to,
    outboundDate: row.trip_date,
    returnDate: row.return_date ?? "",
    passengers: row.passengers,
    coachSize: row.coach_size,
    journeyDetails: row.message,
  };
}
