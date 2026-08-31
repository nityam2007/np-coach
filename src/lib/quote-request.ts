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
  name: string | null;
  email: string | null;
  phone: string | null;
  trip_from: string | null;
  trip_to: string | null;
  trip_date: string | null;
  return_date: string | null;
  passengers: number;
  coach_size: string | null;
  message: string | null;
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
  const text = (value: string | null | undefined) => value?.trim() ?? "";
  return {
    name: text(row.name),
    email: text(row.email),
    phone: text(row.phone),
    pickup: text(row.trip_from),
    destination: text(row.trip_to),
    outboundDate: text(row.trip_date),
    returnDate: text(row.return_date),
    passengers: row.passengers,
    coachSize: text(row.coach_size),
    journeyDetails: text(row.message),
  };
}
