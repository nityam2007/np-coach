import type { CoachRoute, ScheduledService, ScheduledServiceFare } from "@/lib/site-config";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_ADVANCE_DAYS = 180;

function londonDate(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function londonMinutes(now: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

function departureMinutes(value: string): number | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === "PM") hour += 12;
  return hour * 60 + Number(match[2]);
}

function operatesOn(route: CoachRoute, date: string): boolean {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return !/friday\s+(?:to|–|-)\s+monday/i.test(route.days) || [0, 1, 5, 6].includes(day);
}

export interface JourneyOption {
  service: ScheduledService;
  fare: ScheduledServiceFare;
  departureTime: string;
  arrivalTime: string;
}

function serviceTimeMinutes(value: string): number | null {
  const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function isoWeekday(date: string): number {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

function validSearchDate(date: string, now: Date): boolean {
  if (!DATE_RE.test(date)) return false;
  const today = londonDate(now);
  const max = new Date(`${today}T12:00:00Z`);
  max.setUTCDate(max.getUTCDate() + MAX_ADVANCE_DAYS);
  return date >= today && date <= max.toISOString().slice(0, 10);
}

/**
 * Return every explicitly-priced online departure for a stop pair and date.
 * Missing fares, driver-only services, invalid stop order and closed cutoffs all
 * fail closed; no overlapping route or global fare fallback is used.
 */
export function resolveJourneyOptions(
  services: ScheduledService[],
  fromCode: string,
  toCode: string,
  date: string,
  now = new Date(),
): JourneyOption[] {
  if (!fromCode || !toCode || fromCode === toCode || !validSearchDate(date, now)) return [];
  const today = londonDate(now);
  const weekday = isoWeekday(date);

  return services.flatMap((service) => {
    if (service.salesMode !== "online" || !service.operatingDays.includes(weekday)) return [];
    if (!Number.isInteger(service.capacity) || service.capacity < 1) return [];

    const fromIndex = service.stops.findIndex((stop) => stop.code === fromCode);
    const toIndex = service.stops.findIndex((stop) => stop.code === toCode);
    if (fromIndex < 0 || toIndex <= fromIndex) return [];
    const from = service.stops[fromIndex];
    const to = service.stops[toIndex];
    if (!from.boarding || !to.dropping) return [];

    const departure = serviceTimeMinutes(from.time);
    if (departure === null || serviceTimeMinutes(to.time) === null) return [];
    if (date === today && departure < londonMinutes(now) + 60) return [];

    const fare = service.fares.find((row) => row.from === fromCode && row.to === toCode);
    if (!fare || ![fare.adult, fare.child, fare.infant].every((amount) => Number.isInteger(amount) && amount > 0)) {
      return [];
    }
    return [{ service, fare, departureTime: from.time, arrivalTime: to.time }];
  }).sort((a, b) => a.departureTime.localeCompare(b.departureTime));
}

export function findJourneyByCode(
  services: ScheduledService[],
  serviceCode: string,
  fromCode: string,
  toCode: string,
  date: string,
  now = new Date(),
): JourneyOption | null {
  return resolveJourneyOptions(services, fromCode, toCode, date, now)
    .find((option) => option.service.code === serviceCode) ?? null;
}

export interface JourneyMatch {
  route: CoachRoute;
  departureTime: string;
}

export function findJourney(
  routes: CoachRoute[],
  fromCode: string,
  toCode: string,
  date: string,
  now = new Date(),
): JourneyMatch | null {
  if (!DATE_RE.test(date)) return null;
  const today = londonDate(now);
  const max = new Date(`${today}T12:00:00Z`);
  max.setUTCDate(max.getUTCDate() + MAX_ADVANCE_DAYS);
  if (date < today || date > max.toISOString().slice(0, 10)) return null;

  for (const route of routes) {
    const fromIndex = route.stops.findIndex((stop) => stop.code === fromCode);
    const toIndex = route.stops.findIndex((stop) => stop.code === toCode);
    if (fromIndex < 0 || toIndex <= fromIndex || !operatesOn(route, date)) continue;
    const departure = route.stops[fromIndex].time;
    const minutes = departureMinutes(departure);
    if (minutes === null) continue;
    if (date === today && minutes < londonMinutes(now) + 60) continue;
    return { route, departureTime: departure };
  }
  return null;
}
